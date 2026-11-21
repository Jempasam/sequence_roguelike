import { Fault } from "../../../../../../engine/net/Fault"
import { Rng } from "../../../base/Rng"
import type { SavedUnit } from "../../../save/battleSave"
import { NotEnoughPlayersFault, PeerGoneFault, signal, TimeoutFault } from "../../../../sync/faults"
import { StatePublisher } from "../../../../sync/mode/stateBridge"
import { readProgressMessage } from "../../../../sync/progress/ProgressMessage"
import type { Progress } from "../../../../sync/progress/ProgressMessage"
import { readTeamMessage, teamFault } from "../../../../sync/TeamRequest"
import { Admissions } from "../../Admission"
import type { Admission } from "../../Admission"
import type { GameMember } from "../../GameMember"
import type { GameModeManager } from "../../GameMode"
import type { BattleHandle, GameModeContext } from "../../GameModeContext"
import type { GameModeShareable } from "../../GameModeShareable"
import type { DuelOrder, DuelSaid } from "../duel/DuelOwner"
import { LOSERS_LOSE_ONE } from "../duelRace/DuelOutcome"
import { DuelRound } from "../duelRace/DuelRound"
import type { DuelBattles, DuelFight } from "../duelRace/DuelRound"
import { LifeBook } from "../duelRace/LifeBook"
import type { Matching } from "../duelRace/Matching"
import { writeRaceEndMessage } from "../duelRace/RaceEndMessage"
import type { DuelFought, DuelPlayer, DuelWatched } from "../duelRace/players/DuelPlayer"
import {
    ORDER_RESEND, ORDER_RESUME, ORDER_TEAM, PROGRESS_KEY, RACE_END_KEY,
} from "../duelRace/players/ModeHub"
import type { FightInfo, WatchInfo } from "../duelRace/players/ModeHub"

/** How long the manager waits for the clients of the lobby before it starts with those that joined, in ms. */
export const BUILDER_JOIN_WAIT_MS = 10_000

/** How long the players read the end of the game before they are back in the lobby, in ms. */
export const BUILDER_OVER_LINGER_MS = 10_000

/** The part of a player: a hero goes through the floors, a necromancer builds the monsters it fights with. */
export type BuilderRole = "hero"|"necro"

/** What a game of monster builders is played by. */
export interface BuilderRules {
    /** How many players are heroes, the first that joined: the others are necromancers. */
    readonly heroes: number

    /** How many lives each hero starts with. */
    readonly lives: number

    /** How many floors a hero clears to win: the first to do so wins the game. */
    readonly floors: number

    /** How long a player has to give its team for a duel, in milliseconds. */
    readonly teamTimeoutMs: number
}

/** The camps of a duel of a hero and a necromancer: the hero is the first. */
function pairOf(hero: string, necro: string): Matching {
    return { match: () => ({ fights: [{ sides: [[hero], [necro]] }], watchers: new Map() }) }
}

/** Where a player stands, as the manager knows it. */
interface Standing {
    /** Does it wait at a halt of the duels? */
    atDuel: boolean
    floor: number
    layer: number
}

/**
 * A game of monster builders, as its manager plays it: the heroes go through the floors, each fight a duel
 * against a necromancer; the necromancers build their armies on a map of their own, and wait at the halts of
 * the duels for a hero to come.
 *
 * @remarks
 * Each player plays a run of its own. When a hero waits at a halt of the duels and a necromancer waits at
 * one too, a duel is made of the two, the necromancer drawn at random among those waiting. The other
 * necromancers that wait watch it. The hero that loses a duel loses a life, and the necromancer never does.
 * The game is over when a hero cleared the floors, or when no hero is left.
 */
export class MonsterBuilderManager implements GameModeManager {


    constructor(private readonly rules: BuilderRules){}


    public run(ctx: GameModeContext): void {
        this.#ctx = ctx
        this.#rng = ctx.rng()
        this.#publisher = new StatePublisher(ctx)
        ctx.joined.add(() => this.#joined())
        ctx.after(BUILDER_JOIN_WAIT_MS, () => this.#begin())
    }

    public onJoin(_ctx: GameModeContext, who: GameMember): Admission {
        // Whoever comes once the game started only watches.
        if(this.#isStarted && !this.#roles.has(who.id)) this.#onlookers.add(who.id)
        return Admissions.accept()
    }

    public onQuit(_ctx: GameModeContext, who: GameMember): void {
        this.#abandoned.add(who.id)
        this.#asking.get(who.id)?.(new PeerGoneFault(who.id))
        this.#standings.delete(who.id)
        this.#lifeBook?.leave(who.id)
        this.#check()
        this.#match()
    }

    public onBack(_ctx: GameModeContext, who: GameMember): void {
        this.#order(who.id, ORDER_RESEND)
    }

    public onMessage(_ctx: GameModeContext, from: GameMember, message: GameModeShareable): void {
        const { progress, team } = (message ?? {}) as { progress?: unknown, team?: unknown }
        if(typeof progress === "string") this.#progressOf(from.id, progress)
        if(typeof team === "string") this.#asking.get(from.id)?.(team)
    }


    #ctx: GameModeContext|null = null
    #publisher: StatePublisher|null = null
    #lifeBook: LifeBook|null = null
    #isStarted = false
    #isOver = false
    #rounds = 0
    readonly #roles = new Map<string, BuilderRole>()
    readonly #onlookers = new Set<string>()
    readonly #abandoned = new Set<string>()
    readonly #standings = new Map<string, Standing>()

    /** The players in a duel: not matched again until it is over. */
    readonly #busy = new Set<string>()

    /** The players let go from a halt of the duels, with where they stood: they wait there no more. */
    readonly #released = new Map<string, Standing>()
    readonly #active = new Set<DuelRound>()
    readonly #asking = new Map<string, (answer: string|Fault) => void>()
    readonly #players = new Map<string, DuelPlayer>()
    readonly #duels = new Map<number, BattleHandle>()
    #rng: Rng = new Rng(0)

    /** The members that take part in the game. */
    #present(): readonly GameMember[] {
        return this.#ctx?.members().filter(each => !this.#onlookers.has(each.id)) ?? []
    }

    #joined(): void {
        const ctx = this.#ctx
        if(ctx && !this.#isStarted && this.#present().length >= ctx.expected()) this.#begin()
    }

    #begin(): void {
        const ctx = this.#ctx
        const publisher = this.#publisher
        if(!ctx || !publisher || this.#isStarted) return
        this.#isStarted = true
        const members = this.#present()
        const heroes = members.slice(0, this.rules.heroes)
        const necros = members.slice(heroes.length)
        if(heroes.length === 0 || necros.length === 0){
            ctx.report(new NotEnoughPlayersFault(members.length).describe())
            ctx.end()
            return
        }
        this.#lifeBook = new LifeBook(heroes.map(member => member.id), this.rules.lives, publisher)
        this.#lifeBook.eliminated.add(() => this.#check())
        for(const member of heroes) this.#roles.set(member.id, "hero")
        for(const member of necros) this.#roles.set(member.id, "necro")
        for(const member of members) ctx.openRun(member, { role: this.#roles.get(member.id) ?? "necro" })
    }

    /** What the manager hears of where a player stands. */
    #progressOf(id: string, text: string): void {
        const progress = readProgressMessage(text)
        if(progress instanceof Fault){
            this.#ctx?.report(progress.describe())
            return
        }
        this.#ctx?.publish(`${PROGRESS_KEY}${id}`, text)
        if(this.#abandoned.has(id) || !this.#roles.has(id)) return
        this.#hear(id, progress)
    }

    #hear(id: string, progress: Progress): void {
        const standing: Standing = { atDuel: progress.atDuel, floor: progress.floor, layer: progress.layer }
        this.#standings.set(id, standing)
        const released = this.#released.get(id)
        const moved = released && (released.floor !== standing.floor || released.layer !== standing.layer)
        if(released && (!standing.atDuel || moved)) this.#released.delete(id)
        // A hero that went through all its floors won: it entered the one after.
        const isHero = this.#roles.get(id) === "hero" && this.#lifeBook?.isAlive(id)
        if(isHero && progress.floor > this.rules.floors){
            this.#conclude(id)
            return
        }
        this.#match()
    }

    /** Does a player wait at a halt of the duels, free to be matched or to watch? */
    #waiting(id: string): boolean {
        const member = this.#member(id)
        return !!member && member.connected && !this.#busy.has(id) && !this.#released.has(id)
            && (this.#standings.get(id)?.atDuel ?? false)
    }

    /** The players that watch: the necromancers waiting, and the heroes that are out. */
    #watchers(): string[] {
        return [...this.#roles.keys()].filter(id => {
            if(!this.#waiting(id)) return false
            return this.#roles.get(id) === "necro" || !this.#lifeBook?.isAlive(id)
        })
    }

    /** Match each hero waiting with a necromancer waiting, drawn at random, and make the others watch. */
    #match(): void {
        if(!this.#isStarted || this.#isOver) return
        const lifeBook = this.#lifeBook
        if(!lifeBook) return
        const waiting = [...this.#roles].filter(([id]) => this.#waiting(id))
        const heroes = waiting.filter(([id, role]) => role === "hero" && lifeBook.isAlive(id)).map(([id]) => id)
        const necros = waiting.filter(([, role]) => role === "necro").map(([id]) => id)
        for(const hero of heroes){
            const necro = this.#rng.pick(necros)
            if(necro === undefined) break
            necros.splice(necros.indexOf(necro), 1)
            this.#duel(hero, necro)
        }
        this.#watchAll()
    }

    /** Have a player watch a duel drawn at random among those fought, when there are any. */
    #watch(id: string): void {
        if(this.#watching.has(id)) return
        const fights = [...this.#active].flatMap(round => round.fights)
        const fight = this.#rng.pick(fights)
        if(!fight) return
        this.#watching.add(id)
        this.#playerOf(id)?.watch({ number: fight.number, sides: fight.sides })
    }

    /** The players that were shown a duel to watch, until they fight or are let go. */
    readonly #watching = new Set<string>()

    /** Make the duel of a hero and a necromancer. */
    #duel(hero: string, necro: string): void {
        const ctx = this.#ctx
        const lifeBook = this.#lifeBook
        if(!ctx || !lifeBook) return
        this.#busy.add(hero)
        this.#busy.add(necro)
        this.#watching.delete(hero)
        this.#watching.delete(necro)
        const round = new DuelRound(
            id => this.#playerOf(id), pairOf(hero, necro), this.#rng, ++this.#rounds * 1_000, this.#battles,
        )
        this.#active.add(round)
        const observers = [
            // A hero that brings no team loses its duel; a necromancer that brings none has no life to lose.
            round.excluded.add(id => lifeBook.lose(id)),
            round.decided.add(({ fight, winner }) => LOSERS_LOSE_ONE.apply(fight, winner, lifeBook)),
            round.allDecided.add(() => this.#endRound(round, observers, [hero, necro])),
            round.faulted.add(fault => ctx.report(fault.describe())),
            round.ended.add(fault => {
                ctx.report(fault.describe())
                this.#endRound(round, observers, [hero, necro])
            }),
        ]
        // Once its battle is made, the players waiting are shown it to watch.
        void round.start([hero, necro]).then(() => this.#watchAll())
    }

    #watchAll(): void {
        for(const id of this.#watchers()) this.#watch(id)
    }

    #endRound(round: DuelRound, observers: readonly { remove(): void }[], fighters: readonly string[]): void {
        if(!this.#active.delete(round)) return
        for(const observer of observers) observer.remove()
        round.dispose()
        this.#lifeBook?.settle()
        for(const id of fighters){
            this.#busy.delete(id)
            // A hero that is out stays where it is, to watch: the others go on with their journeys.
            if(this.#roles.get(id) === "hero" && !this.#lifeBook?.isAlive(id)) continue
            this.#resume(id)
        }
        // The players that watched it are shown another duel, or wait for one.
        this.#watching.clear()
        this.#check()
        this.#match()
    }

    /** Let a player go on with its journey. */
    #resume(id: string): void {
        const standing = this.#standings.get(id)
        if(standing) this.#released.set(id, { ...standing })
        this.#order(id, ORDER_RESUME)
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
        return {
            id,
            team: () => this.#ask(id),
            fight: (duel: DuelFought, units: readonly string[]) => {
                const member = this.#member(id)
                const info: FightInfo = {
                    fight: { number: duel.number, allies: duel.allies, opponents: duel.opponents },
                }
                const shared = info as unknown as { [key: string]: GameModeShareable }
                if(member) this.#duels.get(duel.number)?.play(member, units, shared)
                return { dispose: () => {} }
            },
            watch: (duel: DuelWatched) => {
                const member = this.#member(id)
                const info: WatchInfo = { watch: { number: duel.number, sides: duel.sides } }
                if(member) this.#duels.get(duel.number)?.control(member, info as unknown as GameModeShareable)
            },
            // A hero is never sent to the duels: the places of its map are them.
            kick: () => {},
            resume: () => this.#order(id, ORDER_RESUME),
            back: () => {},
            refresh: () => this.#order(id, ORDER_RESEND),
            end: () => {},
        }
    }

    /**
     * Where the battles of the duels are made: as battles of the game, owned by the hero of each, who plays
     * them and tells how they end. Shown to the players that fight or watch.
     */
    get #battles(): DuelBattles {
        return {
            open: (fight: DuelFight, save, units) => {
                const ownerId = fight.sides[0][0]
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
                    // A duel stopped because its owner left is over: the hero loses, the necromancer wins.
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

    /** Is the game over: no hero is left, with no duel being fought? */
    #check(): void {
        const lifeBook = this.#lifeBook
        if(!lifeBook || this.#isOver || this.#active.size > 0) return
        lifeBook.settle()
        if(lifeBook.alive().length === 0) this.#conclude(null)
    }

    #conclude(winner: string|null): void {
        const ctx = this.#ctx
        if(this.#isOver || !ctx) return
        this.#isOver = true
        for(const round of this.#active) round.dispose()
        this.#active.clear()
        ctx.publish(RACE_END_KEY, writeRaceEndMessage({ winner }))
        for(const member of this.#present()) this.#order(member.id, ORDER_RESUME)
        ctx.after(BUILDER_OVER_LINGER_MS, () => ctx.end())
    }
}
