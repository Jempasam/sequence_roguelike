import type { TimerPort } from "../../../../../platform"
import { Fault } from "../../../../../engine/net/Fault"
import { Rng } from "../../../sim/base/Rng"
import type { Battle } from "../../../sim/battle/Battle"
import type { FloorType } from "../../../sim/floor/Floor"
import { upgradeFloorType } from "../../../sim/floor/subs/UpgradeFloor"
import type { Run } from "../../../sim/run/Run"
import { loadBattle } from "../../../sim/save/battleSave"
import type { BattleSave, SavedUnit } from "../../../sim/save/battleSave"

import type { BattleHost } from "../../battle/BattleHost"
import { Deadline } from "../../Deadline"
import { NotEnoughPlayersFault, PeerGoneFault, TimeoutFault } from "../../faults"
import { EventRoom } from "../../mode/EventRoom"
import type {
    BattleHandle, GameMember, GameMode, GameModeContext, GameModeDef, Me, RunHandle,
} from "../../mode/GameMode"
import type { GameBench } from "../../mode/gameModeAsLobbyMode"
import { StatePublisher } from "../../mode/stateBridge"
import { Admissions } from "../../participation/Participation"
import type { Admission } from "../../participation/Participation"
import { readProgressMessage } from "../../progress/ProgressMessage"
import type { Progress } from "../../progress/ProgressMessage"
import { readTeamMessage, teamFault } from "../../TeamRequest"
import type { DuelBattles, DuelFight } from "../../modes/DuelRound"
import { DuelRound } from "../../modes/DuelRound"
import { ArrivalWatch } from "../../modes/duelRace/ArrivalWatch"
import { duelRules } from "../../modes/duelRace/DuelRules"
import type { DuelRules } from "../../modes/duelRace/DuelRules"
import { KICK_TO_DUEL } from "../../modes/duelRace/LatePenalty"
import { LifeBook } from "../../modes/duelRace/LifeBook"
import { writeRaceEndMessage } from "../../modes/duelRace/RaceEndMessage"
import { shrinking } from "../../modes/Matching"
import type { DuelFought, DuelPlayer, DuelWatched } from "../../modes/players/DuelPlayer"
import { DuelRacePlayer } from "../../modes/players/DuelRacePlayer"
import {
    ModeHub, ORDER_KICK, ORDER_RESEND, ORDER_RESUME, ORDER_TEAM, PROGRESS_KEY, RACE_END_KEY,
} from "../../modes/players/ModeHub"
import type { FightInfo, WatchInfo } from "../../modes/players/ModeHub"
import { RangeSetting } from "../Setting"
import type { Setting, SettingValues } from "../Setting"

/** A run played on the screen of a player of a race, by itself: nobody plays it for it. */
export interface RaceScreen {
    /** The run of the player, new, which the screen shows. */
    readonly run: Run

    /**
     * Show the race of a player on the run: its duels fought or watched, the lives of the players, the time
     * left, and who stands where. Does nothing of what the player does: it only shows, and says it is ready.
     */
    follow(player: DuelRacePlayer): void

    /** Take the run off the screen. */
    close(): void
}

/** The race started with the lobby, and this client came when it was on already. */
export class RaceStartedFault extends Fault {


    public readonly who = null

    public describe(): string {
        return "La course a déjà commencé : elle ne se rejoint pas en cours."
    }
}

/** How long the players read the end of a race before they are back in the lobby, in ms. */
export const RACE_OVER_LINGER_MS = 10_000

/**
 * How long the manager waits for the clients of the lobby, before it starts with those that joined, in ms.
 */
export const JOIN_WAIT_MS = 10_000

/** What a race of duels asks of the screen, which it knows nothing of. */
export interface RaceTableBench extends GameBench {
    /**
     * Show a new run for a player of a race.
     *
     * @param firstFloor - The floor it starts on, the usual one for none.
     */
    race(firstFloor: FloorType|null): RaceScreen
}

/** What a race of duels takes from its settings. */
interface Course {
    /** The rules of the race, the same on every client. */
    rules(values: SettingValues, rng: Rng): DuelRules

    /** The floor the players start on, none for the usual one. */
    floor(values: SettingValues): FloorType|null
}

/** The sender of a round that tells its duels by itself: it tells nothing. */
const NO_SENDER = { send: () => {}, onPeer: () => ({ dispose: () => {} }) }

/** The kinds of order a player is told, which a connection coming back tells again. */
type Order = typeof ORDER_KICK|null

/**
 * A race of duels, as the runner plays it: each player plays a run of its own, and the manager makes the
 * players that
 * arrived at the duels into camps, has the duels fought, and takes lives from the losers, until one is left.
 *
 * @remarks
 * One object plays each role. The manager's reads where the players stand, keeps their lives and the one
 * time limit,
 * and has a {@link DuelRound} fight the duels as battles of its own; the player's plays its run, which its
 * screen
 * shows, through a {@link DuelRacePlayer} that reaches the manager as it always did, through a {@link
 * ModeHub}.
 */
class DuelRaceTable implements GameMode {


    constructor(
        private readonly rules: DuelRules,
        private readonly floor: FloorType|null,
        private readonly bench: RaceTableBench,
    ){}


    // ===== The manager =====

    public run(ctx: GameModeContext): void {
        this.#ctx = ctx
        this.#publisher = new StatePublisher(ctx)
        ctx.joined.add(() => this.#joined())
        // Starts once everyone of the lobby joined, or with those that did after a while.
        ctx.after(JOIN_WAIT_MS, () => this.#begin())
    }

    public onJoin(_ctx: GameModeContext, who: GameMember): Admission {
        const lifeBook = this.#lifeBook
        if(!this.#isStarted) return Admissions.seat(who.id)
        // Someone that comes once the race started may play it if the rules say so: the mode alone decides.
        if(!lifeBook || this.#isOver || this.#abandoned.has(who.id)) return Admissions.spectate()
        const state = {
            rounds: this.#rounds,
            arrivalStarted: this.#arrival?.isStarted ?? false,
            lives: lifeBook.alive().map(id => lifeBook.livesOf(id)),
        }
        if(!this.rules.lateJoin.admits(state)) return Admissions.spectate()
        lifeBook.add(who.id, this.rules.lateJoin.lives(state))
        return Admissions.seat(who.id)
    }

    public onLeave(_ctx: GameModeContext, who: GameMember, gone: boolean): void {
        if(who.presence !== "left" && !gone){
            this.#room.lose(who.id)
            return
        }
        // A player that left the race, by itself or for good, is out at once and never plays it again.
        this.#abandoned.add(who.id)
        this.#asking.get(who.id)?.(new PeerGoneFault(who.id))
        this.#lifeBook?.eliminate(who.id)
        this.#room.leave(who.id)
        this.#arrival?.check()
        this.#check()
    }

    public onBack(_ctx: GameModeContext, who: GameMember): void {
        this.#room.return(who.id)
        // What it said and was told while its connection was lost is said again.
        if(this.#lastOrder === ORDER_KICK && this.#kicked.has(who.id)) this.#order(who.id, ORDER_KICK)
        this.#order(who.id, ORDER_RESEND)
    }

    public onTell(_ctx: GameModeContext, from: GameMember, message: unknown): void {
        const { progress, team } = (message ?? {}) as { progress?: unknown, team?: unknown }
        if(typeof progress === "string") this.#progressOf(from.id, progress)
        if(typeof team === "string") this.#asking.get(from.id)?.(team)
    }

    public onBattleIntent(from: GameMember, _info: unknown, battle: Battle, intent: unknown): boolean {
        const host = this.#hosts.get(battle)
        if(!host) return false
        // A player on the very battle of the manager committed already: it only says it is ready.
        const owes = battle.awaited.units.some(unit => host.seats.holderOf(unit.name) === from.id)
        if(owes) host.receive(from.id, JSON.stringify(intent))
        else host.committed(from.id)
        return true
    }

    // ===== The owner of a run, and its replicas =====

    public createRun(): Run {
        const screen = this.bench.race(this.floor)
        this.#screens.set(screen.run, screen)
        return screen.run
    }

    public createBattle(spec: unknown): Battle {
        return loadBattle(spec as BattleSave)
    }

    // ===== The player =====

    public onShowRun(me: Me, run: Run): void {
        const screen = this.#screens.get(run)
        if(!screen || this.#mine?.run === run) return
        const hub = new ModeHub(me, this.bench.timer)
        // What was told before the run was shown is told now.
        for(const [key, value] of this.#told) hub.state(key, value)
        const player = new DuelRacePlayer(this.rules, hub, run, me.id)
        player.faulted.add(fault => this.bench.report(fault.describe()))
        screen.follow(player)
        this.#mine = { run, hub, player, screen }
    }

    public onShowBattle(_me: Me, battle: Battle, info: unknown): void {
        this.#mine?.hub.duel(battle, info)
    }

    public onHide(_me: Me, instance: Run|Battle): void {
        const mine = this.#mine
        if(!mine) return
        if(instance === mine.run){
            this.#mine = null
            mine.player.dispose()
            mine.screen.close()
        } else mine.hub.endDuel()
    }

    public onOrder(_me: Me, order: unknown): void {
        this.#mine?.hub.order(order)
    }

    public onState(_me: Me, key: string, value: unknown): void {
        if(value === null) this.#told.delete(key)
        else this.#told.set(key, value)
        this.#mine?.hub.state(key, value)
    }


    #ctx: GameModeContext|null = null
    #publisher: StatePublisher|null = null
    #deadline: Deadline|null = null
    #lifeBook: LifeBook|null = null
    #arrival: ArrivalWatch|null = null
    #round: DuelRound|null = null
    #isStarted = false
    #isOver = false
    #rounds = 0
    #lastOrder: Order = null
    readonly #room = new EventRoom()
    readonly #abandoned = new Set<string>()
    readonly #runs = new Map<string, RunHandle>()
    readonly #kicked = new Set<string>()
    readonly #asking = new Map<string, (answer: string|Fault) => void>()
    readonly #players = new Map<string, DuelPlayer>()
    readonly #duels = new Map<Battle, BattleHandle>()
    readonly #hosts = new Map<Battle, BattleHost>()
    readonly #rng = new Rng(Date.now() + 1)

    /** What the player holds of the race it plays: its run, what reads it, the screen. */
    #mine: {
        readonly run: Run
        readonly hub: ModeHub
        readonly player: DuelRacePlayer
        readonly screen: RaceScreen
    }|null = null

    /** The runs and screens made here, by their run. */
    readonly #screens = new Map<Run, RaceScreen>()

    /** What the manager told, as it came: told to the player once it has a run to show. */
    readonly #told = new Map<string, unknown>()

    get #timer(): TimerPort {
        return this.bench.timer
    }

    #present(): readonly GameMember[] {
        return this.#ctx?.members().filter(each => each.presence === "player") ?? []
    }

    #joined(): void {
        const ctx = this.#ctx
        if(!ctx) return
        if(!this.#isStarted){
            if(this.#present().length >= ctx.expected()) this.#begin()
            return
        }
        // A player that came once the race started has a run of its own, from the start of the map.
        for(const member of this.#present()){
            if(this.#runs.has(member.id) || !this.#lifeBook?.isAlive(member.id)) continue
            this.#runs.set(member.id, ctx.openRun(member, {}))
        }
    }

    #begin(): void {
        const ctx = this.#ctx
        const publisher = this.#publisher
        if(!ctx || !publisher || this.#isStarted) return
        this.#isStarted = true
        const members = this.#present()
        if(members.length < 2){
            ctx.report(new NotEnoughPlayersFault(members.length).describe())
            ctx.end()
            return
        }
        this.#deadline = new Deadline(this.#timer, publisher)
        const lifeBook = new LifeBook(members.map(member => member.id), this.rules.lives, publisher)
        const arrival = new ArrivalWatch(this.#deadline, this.rules.arrivalMs, () => lifeBook.alive())
        this.#lifeBook = lifeBook
        this.#arrival = arrival
        lifeBook.lastStanding.add(id => this.#conclude(id))
        arrival.late.add(id => this.#late(id))
        arrival.allArrived.add(() => this.#startRound())
        for(const member of members) this.#runs.set(member.id, ctx.openRun(member, {}))
    }

    /** What the manager hears of where a player stands. */
    #progressOf(id: string, text: string): void {
        const progress = readProgressMessage(text)
        if(progress instanceof Fault){
            this.#ctx?.report(progress.describe())
            return
        }
        this.#ctx?.publish(`${PROGRESS_KEY}${id}`, text)
        this.#hear(id, progress)
    }

    #hear(id: string, progress: Progress): void {
        if(!this.#arrival || this.#abandoned.has(id)) return
        this.#arrival.hear(id, progress)
    }

    #late(id: string): void {
        const lifeBook = this.#lifeBook
        if(!lifeBook) return
        KICK_TO_DUEL.penalize(id, lifeBook, each => this.#playerOf(each)?.kick())
        this.#arrival?.check()
        this.#check()
    }

    #member(id: string): GameMember|null {
        return this.#ctx?.members().find(each => each.id === id) ?? null
    }

    #order(id: string, order: unknown): void {
        const member = this.#member(id)
        if(member) this.#ctx?.order(member, order)
    }

    /** The player of an id, none when it is not there. */
    #playerOf(id: string): DuelPlayer|null {
        const member = this.#member(id)
        if(!member || member.presence !== "player") return null
        let player = this.#players.get(id)
        if(!player){
            player = this.#makePlayer(id)
            this.#players.set(id, player)
        }
        return player
    }

    /** Ask a player for the team it brings, and check it. */
    #ask(id: string): Promise<readonly SavedUnit[]|Fault> {
        const ctx = this.#ctx
        if(!ctx) return Promise.resolve(new PeerGoneFault(id))
        return new Promise(resolve => {
            const settle = (answer: readonly SavedUnit[]|Fault): void => {
                wait.cancel()
                this.#asking.delete(id)
                resolve(answer)
            }
            const wait = ctx.after(this.rules.teamTimeoutMs, () => settle(new TimeoutFault(id, "the team")))
            this.#asking.set(id, answer => {
                if(answer instanceof Fault){
                    settle(answer)
                    return
                }
                const units = readTeamMessage(answer)
                settle(units instanceof Fault ? units : (teamFault(id, units) ?? units))
            })
            this.#order(id, ORDER_TEAM)
        })
    }

    #makePlayer(id: string): DuelPlayer {
        const player: DuelPlayer = {
            id,
            team: () => this.#ask(id),
            fight: (duel: DuelFought, battle: Battle, host: BattleHost, units: readonly string[]) => {
                this.#hosts.set(battle, host)
                const member = this.#member(id)
                const info: FightInfo = {
                    fight: { number: duel.number, allies: duel.allies, opponents: duel.opponents, units },
                }
                if(member) this.#duels.get(battle)?.control(member, info)
                return { dispose: () => {} }
            },
            watch: (duel: DuelWatched, battle: Battle) => {
                const member = this.#member(id)
                const info: WatchInfo = { watch: { number: duel.number, sides: duel.sides } }
                if(member) this.#duels.get(battle)?.control(member, info)
            },
            kick: () => {
                this.#lastOrder = ORDER_KICK
                this.#kicked.add(id)
                this.#order(id, ORDER_KICK)
            },
            resume: () => {
                // Letting go is not told again: a party that went on and waits at the next duels would be
                // let go of.
                this.#kicked.delete(id)
                this.#order(id, ORDER_RESUME)
            },
            // The duel it was shown is shown again by the runner when its connection comes back.
            back: () => {},
            refresh: () => {
                if(this.#kicked.has(id)) this.#order(id, ORDER_KICK)
                this.#order(id, ORDER_RESEND)
            },
            end: () => {},
        }
        return player
    }

    /**
     * Where the battles of the duels are made: as battles of the game, shown to the players that fight or
     * watch.
     */
    get #battles(): DuelBattles {
        return {
            open: (_fight: DuelFight, save) => {
                const handle = this.#ctx?.openManagedBattle(save)
                const battle = handle?.battle() ?? null
                if(!handle || !battle) return null
                this.#duels.set(battle, handle)
                return battle
            },
            close: (fight: DuelFight) => {
                for(const [battle, handle] of [...this.#duels]){
                    const own = this.#round?.battleOf(fight.number)
                    if(own !== battle) continue
                    handle.close()
                    this.#duels.delete(battle)
                    this.#hosts.delete(battle)
                }
            },
        }
    }

    /** Make the round of duels of the players still in. */
    #startRound(): void {
        const ctx = this.#ctx
        const { rules } = this
        const lifeBook = this.#lifeBook
        if(!ctx || !lifeBook || this.#round || this.#isOver) return
        const players = lifeBook.alive()
        if(players.length < 2){
            this.#check()
            return
        }
        const round = new DuelRound(
            this.#room, NO_SENDER, id => this.#playerOf(id), rules.matching, this.#rng,
            ++this.#rounds * 1_000,
            this.#battles,
        )
        this.#round = round
        const spectators = this.#present().map(member => member.id).filter(id => !players.includes(id))
        const observers = [
            round.excluded.add(id => lifeBook.lose(id)),
            round.decided.add(({ fight, winner }) => rules.outcome.apply(fight, winner, lifeBook)),
            round.drawn.add(fight => rules.outcome.apply(fight, null, lifeBook)),
            round.allDecided.add(() => this.#endRound(round, observers)),
            round.faulted.add(fault => ctx.report(fault.describe())),
            // A round that cannot go on is called off with no life lost: only a fault of the mode remains.
            round.ended.add(fault => {
                ctx.report(fault.describe())
                this.#endRound(round, observers)
            }),
        ]
        void round.start(players, spectators)
    }

    #endRound(round: DuelRound, observers: readonly { remove(): void }[]): void {
        if(this.#round !== round) return
        for(const observer of observers) observer.remove()
        round.dispose()
        this.#round = null
        this.#lifeBook?.settle()
        this.#arrival?.reset()
        if(!this.#isOver) this.#resume()
        this.#check()
    }

    /** Let the players go on with their journeys. */
    #resume(): void {
        for(const id of this.#lifeBook?.alive() ?? []) this.#playerOf(id)?.resume()
    }

    /** Is the race over: one player or none is left, with no round being fought? */
    #check(): void {
        const lifeBook = this.#lifeBook
        if(!lifeBook || this.#isOver || this.#round) return
        lifeBook.settle()
        if(!this.#isOver && lifeBook.alive().length === 0) this.#conclude(null)
    }

    #conclude(winner: string|null): void {
        const ctx = this.#ctx
        if(this.#isOver || !ctx) return
        this.#isOver = true
        this.#deadline?.cancel()
        // A client that connects later, or whose connection comes back, is told by what the manager
        // remembers.
        ctx.publish(RACE_END_KEY, writeRaceEndMessage({ winner }))
        for(const member of this.#present()) this.#playerOf(member.id)?.resume()
        // Once the race is over the players read who won, then the lobby is theirs again.
        ctx.after(RACE_OVER_LINGER_MS, () => ctx.end())
    }
}

/** How many players a camp holds at most: the setting of both races. */
const TEAM = new RangeSetting("equipe", "Équipe", 1, 4, 1, 2)

/**
 * A race of duels of a course: what differs among its kinds is where the players start, and where the duels
 * lie.
 */
function raceDef(
    id: string, title: string, description: string, settings: readonly Setting[], course: Course, bench: RaceTableBench,
): GameModeDef {
    return {
        id,
        title,
        description,
        settings,
        create: values => {
            return new DuelRaceTable(course.rules(values, new Rng(Date.now())), course.floor(values), bench)
        },
    }
}

/** The race of duels on the usual floors, a row of the duels every so many rows. */
export function duelRaceTable(bench: RaceTableBench): GameModeDef {
    const settings = [
        new RangeSetting("vies", "Vies", 1, 10, 1, 6),
        new RangeSetting("arrivee", "Arrivée (s)", 30, 300, 30, 90),
        TEAM,
        new RangeSetting("frequence", "Duel tous les (rangs)", 2, 8, 1, 4),
    ]
    const course: Course = {
        rules: (values, rng) => duelRules(rng, {
            lives: Number(values.vies),
            arrivalMs: Number(values.arrivee) * 1000,
            teamSize: shrinking(Number(values.equipe)),
            duelEvery: Number(values.frequence),
        }),
        floor: () => null,
    }
    const description = "Course sur les étages : survivre aux duels qui jalonnent la route et arriver avant le temps."
    return raceDef("course-duels", "Course de duels", description, settings, course, bench)
}

/** The versus: the players upgrade on a map of their own, then meet in one row of duels. */
export function versusTable(bench: RaceTableBench): GameModeDef {
    const settings = [
        new RangeSetting("equipe", "Équipe", 1, 4, 1, 1),
        new RangeSetting("hauteur", "Hauteur de la carte", 2, 8, 1, 4),
    ]
    const course: Course = {
        rules: (values, rng) => duelRules(rng, {
            lives: 1,
            teamSize: shrinking(Number(values.equipe)),
            // No row of the duels in the middle of the map: the one at its end.
            duelEvery: 1_000,
            closing: true,
            // The map is the one floor of the workshop.
            floors: 1,
        }),
        floor: values => upgradeFloorType(Number(values.hauteur)),
    }
    const description = "Chacun améliore son équipe sur sa carte, puis tous s'affrontent dans une rangée de duels finale."
    return raceDef("versus", "Versus", description, settings, course, bench)
}
