import type { TimerPort } from "../../../../../../platform"
import { Fault } from "../../../../../../engine/net/Fault"
import { Rng } from "../../../base/Rng"
import type { SavedUnit } from "../../../save/battleSave"
import { Deadline } from "../../../../sync/Deadline"
import { NotEnoughPlayersFault, PeerGoneFault, signal, TimeoutFault } from "../../../../sync/faults"
import { StatePublisher } from "../../../../sync/mode/stateBridge"
import { readProgressMessage } from "../../../../sync/progress/ProgressMessage"
import type { Progress } from "../../../../sync/progress/ProgressMessage"
import { readTeamMessage, teamFault } from "../../../../sync/TeamRequest"
import { Admissions } from "../../Admission"
import type { Admission } from "../../Admission"
import type { GameMember } from "../../GameMember"
import type { GameModeManager } from "../../GameMode"
import type { BattleHandle, GameModeContext, RunHandle } from "../../GameModeContext"
import type { GameModeShareable } from "../../GameModeShareable"
import type { DuelOrder, DuelSaid } from "../duel/DuelOwner"

import { ArrivalWatch } from "./ArrivalWatch"
import type { DuelRules } from "./DuelRules"
import { DuelRound } from "./DuelRound"
import type { DuelBattles, DuelFight } from "./DuelRound"
import { KICK_TO_DUEL } from "./LatePenalty"
import { LifeBook } from "./LifeBook"
import { writeRaceEndMessage } from "./RaceEndMessage"
import type { DuelFought, DuelPlayer, DuelWatched } from "./players/DuelPlayer"
import { ORDER_KICK, ORDER_RESEND, ORDER_RESUME, ORDER_TEAM, PROGRESS_KEY, RACE_END_KEY } from "./players/ModeHub"
import type { FightInfo, WatchInfo } from "./players/ModeHub"

/** How long the players read the end of a race before they are back in the lobby, in ms. */
export const RACE_OVER_LINGER_MS = 10_000

/**
 * How long the manager waits for the clients of the lobby, before it starts with those that joined, in ms.
 */
export const JOIN_WAIT_MS = 10_000

/** The kinds of order a player is told, which a connection coming back tells again. */
type Order = typeof ORDER_KICK|null

/**
 * A race of duels, as its manager plays it: each player plays a run of its own, and the manager makes the
 * players that arrived at the duels into camps, has the duels fought, and takes lives from the losers, until
 * one is left.
 *
 * @remarks
 * The manager reads where the players stand, keeps their lives and the one time limit, and has a
 * {@link DuelRound} fight the duels as battles of their own. A player that loses its connection, comes back or
 * leaves in a duel is told to the owner of the duel by the game itself.
 */
export class DuelRaceManager implements GameModeManager {


    constructor(private readonly rules: DuelRules){}


    public run(ctx: GameModeContext): void {
        this.#ctx = ctx
        this.#publisher = new StatePublisher(ctx)
        ctx.joined.add(() => this.#joined())
        // Starts once everyone of the lobby joined, or with those that did after a while.
        ctx.after(JOIN_WAIT_MS, () => this.#begin())
    }

    public onJoin(_ctx: GameModeContext, who: GameMember): Admission {
        const lifeBook = this.#lifeBook
        if(!this.#isStarted) return Admissions.accept()
        // Someone that comes once the race started may play it if the rules say so: the mode alone decides.
        // The others are let in all the same, and only watch.
        if(!lifeBook || this.#isOver || this.#abandoned.has(who.id)){
            this.#onlookers.add(who.id)
            return Admissions.accept()
        }
        const state = {
            rounds: this.#rounds,
            arrivalStarted: this.#arrival?.isStarted ?? false,
            lives: lifeBook.alive().map(id => lifeBook.livesOf(id)),
        }
        if(!this.rules.lateJoin.admits(state)){
            this.#onlookers.add(who.id)
            return Admissions.accept()
        }
        lifeBook.add(who.id, this.rules.lateJoin.lives(state))
        return Admissions.accept()
    }

    public onQuit(_ctx: GameModeContext, who: GameMember): void {
        // A player that left the race, by itself or for good, is out at once and never plays it again.
        this.#abandoned.add(who.id)
        this.#asking.get(who.id)?.(new PeerGoneFault(who.id))
        // Out at once, and told as gone: the frieze greys it and gives no name for it.
        this.#lifeBook?.leave(who.id)
        this.#arrival?.check()
        this.#check()
    }

    public onBack(_ctx: GameModeContext, who: GameMember): void {
        // What it said and was told while its connection was lost is said again.
        if(this.#lastOrder === ORDER_KICK && this.#kicked.has(who.id)) this.#order(who.id, ORDER_KICK)
        this.#order(who.id, ORDER_RESEND)
    }

    /** A player told the manager something: where it stands, or the team it brings. */
    public onMessage(_ctx: GameModeContext, from: GameMember, message: GameModeShareable): void {
        const { progress, team } = (message ?? {}) as { progress?: unknown, team?: unknown }
        if(typeof progress === "string") this.#progressOf(from.id, progress)
        if(typeof team === "string") this.#asking.get(from.id)?.(team)
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
    readonly #abandoned = new Set<string>()

    /** The members let in after the start that have no life: they only watch. */
    readonly #onlookers = new Set<string>()
    readonly #runs = new Map<string, RunHandle>()
    readonly #kicked = new Set<string>()
    readonly #asking = new Map<string, (answer: string|Fault) => void>()
    readonly #players = new Map<string, DuelPlayer>()
    readonly #duels = new Map<number, BattleHandle>()
    readonly #rng = new Rng(Date.now() + 1)

    /** The time of the game, as the bricks that have deadlines read it. */
    get #timer(): TimerPort {
        const ctx = this.#ctx as GameModeContext
        return { now: () => ctx.now(), after: (ms, run) => ctx.after(ms, run) }
    }

    /** The members that take part in the race. */
    #present(): readonly GameMember[] {
        return this.#ctx?.members().filter(each => !this.#onlookers.has(each.id)) ?? []
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
        arrival.allArrived.add(() => this.#startRound([]))
        // The time limit came: the round goes on at once, the late are bots until they are there.
        arrival.expired.add(late => this.#startRound(late))
        arrival.arrived.add(id => this.#round?.arrived(id))
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
    }

    #member(id: string): GameMember|null {
        return this.#ctx?.members().find(each => each.id === id) ?? null
    }

    #order(id: string, order: GameModeShareable): void {
        const member = this.#member(id)
        if(member) this.#ctx?.channel(member).notify(order)
    }

    /** The player of an id, none when it is not there. */
    #playerOf(id: string): DuelPlayer|null {
        const member = this.#member(id)
        if(!member || this.#onlookers.has(id)) return null
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
            fight: (duel: DuelFought, units: readonly string[]) => {
                const member = this.#member(id)
                const info: FightInfo = {
                    fight: { number: duel.number, allies: duel.allies, opponents: duel.opponents },
                }
                if(member) this.#duels.get(duel.number)?.play(member, units, info as unknown as { [key: string]: GameModeShareable })
                return { remove: () => {} }
            },
            watch: (duel: DuelWatched) => {
                const member = this.#member(id)
                const info: WatchInfo = { watch: { number: duel.number, sides: duel.sides } }
                if(member) this.#duels.get(duel.number)?.control(member, info as unknown as GameModeShareable)
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
            // The duel it was shown is shown again by the game when its connection comes back.
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
     * Where the battles of the duels are made: as battles of the game, owned by the first fighter of each,
     * who plays them and tells how they end. Shown to the players that fight or watch.
     */
    get #battles(): DuelBattles {
        return {
            open: (fight: DuelFight, save, units) => {
                // The owner plays the duel on its engine: one that is there, not one busy elsewhere.
                const fighters = fight.sides.flat()
                const ownerId = fighters.find(id => this.#arrival?.isThere(id)) ?? fight.sides[0][0]
                const owner = this.#member(ownerId)
                if(!this.#ctx || !owner) return null
                const handle = this.#ctx.openBattle(owner, save as unknown as GameModeShareable)
                const over = signal<string|null>()
                const failed = signal<string>()
                handle.said.add(message => {
                    const said = message as DuelSaid
                    if(said.over) over.notify(said.over.winner)
                    if(said.failed !== undefined) failed.notify(said.failed)
                })
                handle.invalidated.add(() => {
                    // A duel stopped because its owner left is over: the owner loses, and the camp it was not
                    // in wins. One that was closed by the end of the duel was settled already.
                    const gone = this.#member(owner.id) === null
                    const winner = fight.sides.findIndex(side => !side.includes(owner.id))
                    if(gone && winner >= 0) over.notify(`Camp ${winner + 1}`)
                    else failed.notify("Le propriétaire du duel est parti.")
                })
                this.#duels.set(fight.number, handle)
                handle.notify({ start: units } satisfies DuelOrder)
                return {
                    over,
                    failed,
                    // Only for a player that is not there when its duel starts, which no one plays yet.
                    lost: id => void handle.notify({ lost: id } satisfies DuelOrder),
                    back: id => void handle.notify({ back: id } satisfies DuelOrder),
                    close: () => {
                        handle.close()
                        this.#duels.delete(fight.number)
                    },
                }
            },
        }
    }

    /** Make the round of duels of the players still in. */
    #startRound(late: readonly string[]): void {
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
            id => this.#playerOf(id), rules.matching, this.#rng,
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
        void round.start(players, spectators, late.filter(id => players.includes(id)))
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
