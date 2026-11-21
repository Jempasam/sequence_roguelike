import { Fault } from "../../../../../../engine/net/Fault"
import type { Observable, Observer } from "../../../base/Observable"
import type { Rng } from "../../../base/Rng"
import { duelSave } from "../../../duel/duelBattle"
import type { DuelParty } from "../../../duel/duelBattle"
import type { BattleSave, SavedUnit } from "../../../save/battleSave"

import { DuelBuildFault, NotEnoughPlayersFault, PeerGoneFault, signal, UnloadableFault } from "../../../../sync/faults"
import { detailOf } from "../../../../sync/read"
import type { Matched, Matching } from "./Matching"
import type { DuelFought, DuelPlayer } from "./players/DuelPlayer"
import type { Removable } from "../../../../../../lifetime"

/** A duel as it is fought: the players of each of its two camps, those left out for their team apart. */
export interface DuelFight {
    /** Its number in the round. */
    readonly number: number

    readonly sides: readonly [readonly string[], readonly string[]]
}

/** A duel that has a winner. */
export interface DuelDecision {
    readonly fight: DuelFight

    /** The index of the camp that won. */
    readonly winner: number

    readonly winners: readonly string[]
    readonly losers: readonly string[]
}

/** The names of the units each player brings to a duel, by the id of the player. */
export type DuelUnits = Readonly<Record<string, readonly string[]>>

/**
 * What a round holds of the battle of a duel: it is played elsewhere, by the one that owns it, and the round
 * hears how it ended.
 */
export interface DuelBattle {
    /** Told once when the battle is over: the name of the camp that won, none for a draw. */
    readonly over: Observable<string|null>

    /** Told once when the battle cannot be played, with why. */
    readonly failed: Observable<string>

    /** A player that is not there yet: its units are planned as bots until it is back. */
    lost(id: string): void

    /** The player that was not there is there: it plays its units again. */
    back(id: string): void

    /** The duel is over for the players that followed it. */
    close(): void
}

/**
 * Where the battles of the duels are made, and by whom: a game that has them played by its players, as a
 * game of the runner does.
 */
export interface DuelBattles {
    /**
     * Make the battle of a duel from its save, to be played by its owner.
     *
     * @param units - The names of the units each player brings, by the id of the player.
     * @returns None when it cannot be made.
     */
    open(fight: DuelFight, save: BattleSave, units: DuelUnits): DuelBattle|null
}

/** A duel being fought. */
interface Fighting {
    readonly fight: DuelFight
    readonly battle: DuelBattle
    readonly handles: Removable[]
    readonly observers: Observer[]

    /** Was the duel settled: decided, drawn, or called off? */
    isDone: boolean
}

/**
 * One round of duels, on the hub: it makes the players into camps and duels, asks the fighters for their
 * teams, tells every player which duel it fights or watches, and hears how each duel ended.
 *
 * @remarks
 * It knows no rules of what a duel is worth: it tells how each duel ended, and the mode decides. A player
 * whose team cannot be had is left out of its duel, which goes on without it; when a camp is left empty the
 * other wins. A player that leaves for good is played as a bot, and when a whole camp left the other wins. A
 * round that cannot make a duel is over with {@link DuelRound.ended}, nothing decided.
 *
 * It holds no battle: each is made by a {@link DuelBattles} and played by its owner, and each unit is the
 * player's that brought it. It reaches every player through a {@link DuelPlayer}, and never knows how.
 */
export class DuelRound {


    /** Told once, with the duels and the spectators, when the players are made into camps. */
    public readonly matched = signal<Matched>()

    /** Told of each player left out of its duel, which it loses: it has no team to fight with. */
    public readonly excluded = signal<string>()

    /** Told of each duel that has a winner. */
    public readonly decided = signal<DuelDecision>()

    /** Told of each duel that ended with no winner. */
    public readonly drawn = signal<DuelFight>()

    /** Told once every duel is decided, drawn or called off. */
    public readonly allDecided = signal<void>()

    /** Told of what was dealt with: a team that was not had, a duel called off, a plan that failed. */
    public readonly faulted = signal<Fault>()

    /** Told once, when the round cannot go on: nothing is decided then. */
    public readonly ended = signal<Fault>()

    constructor(
        /** The player of an id, none when it is not there: a client not connected any more. */
        private readonly playerOf: (id: string) => DuelPlayer|null,

        private readonly matching: Matching,

        /** The seeds of the battles are drawn from it. */
        private readonly rng: Rng,

        /**
         * What the number of its first duel is: the numbers of the duels of a mode that plays rounds are told
         * apart from those of the rounds before, so a client never takes a duel for the one it fought.
         */
        private readonly base: number,

        /** Where the battles are made. */
        private readonly battles: DuelBattles,
    ){}


    /** The duels of the round, as they are fought. */
    public get fights(): readonly DuelFight[] {
        return [...this.#fightings.values()].map(({ fight }) => fight)
    }

    /**
     * Make the round of these players. It resolves once every duel is under way, and never rejects; how they
     * end is told by the observables.
     *
     * @param spectators - The players out of the round, who watch a duel drawn at random: those eliminated.
     */
    public async start(
        players: readonly string[],
        spectators: readonly string[] = [],
        late: readonly string[] = [],
    ): Promise<void> {
        if(this.#isStarted) return
        this.#isStarted = true
        this.#late = new Set(late)
        const matched = this.matching.match(players)
        this.matched.notify(matched)
        if(matched.fights.length === 0){
            this.#end(new NotEnoughPlayersFault(players.length))
            return
        }
        const fighters = matched.fights.flatMap(fight => fight.sides.flat())
        const answers = await Promise.all(fighters.map(id => this.#teamOf(id)))
        if(this.#isDisposed) return
        const teams = new Map<string, readonly SavedUnit[]>()
        fighters.forEach((id, index) => {
            const answer = answers[index]
            if(answer instanceof Fault) this.excluded.notify(id)
            else teams.set(id, answer)
        })
        const fights = matched.fights.map((fight, index): DuelFight => ({
            number: this.base + index,
            sides: [fight.sides[0].filter(id => teams.has(id)), fight.sides[1].filter(id => teams.has(id))],
        }))
        this.#total = fights.length
        const watchers = new Map(matched.watchers)
        for(const id of spectators) watchers.set(id, this.rng.int(fights.length))
        for(const fight of fights) this.#run(fight, teams)
        this.#tellWatchers(watchers, fights)
    }

    /** A late player is there: it is shown its duel, which goes on as it is, and takes its units back. */
    public arrived(id: string): void {
        // One there before its duel is made is no late player any more.
        this.#late.delete(id)
        for(const [number, pending] of this.#pending){
            const entry = pending.get(id)
            if(!entry) continue
            pending.delete(id)
            if(pending.size === 0) this.#pending.delete(number)
            const { fighting, fought, units } = entry
            const player = this.playerOf(id)
            if(fighting.isDone || !player) continue
            this.#told.add(id)
            fighting.handles.push(player.fight(fought, units))
            fighting.battle.back(id)
        }
    }

    /** Stop: the duels are left as they are, and nothing is heard or told any more. */
    public dispose(): void {
        this.#isDisposed = true
        this.#pending.clear()
        for(const fighting of this.#fightings.values()){
            this.#release(fighting)
            fighting.battle.close()
        }
        this.#told.clear()
    }


    /** The players not there when the round started. */
    #late = new Set<string>()

    /** What the late players fight with, by duel number then id, until they are there. */
    readonly #pending = new Map<number, Map<string, { fighting: Fighting, fought: DuelFought, units: readonly string[] }>>()

    readonly #fightings = new Map<number, Fighting>()

    /** The players told of their duel this round: one whose connection comes back is told it again. */
    readonly #told = new Set<string>()

    #isStarted = false
    #isDisposed = false
    #isAllDecided = false

    /** How many duels are to be settled, those called off included. */
    #total = 0
    #settledCount = 0

    async #teamOf(id: string): Promise<readonly SavedUnit[]|Fault> {
        const player = this.playerOf(id)
        const answer = player ? await player.team() : new PeerGoneFault(id)
        if(answer instanceof Fault) this.faulted.notify(answer)
        return answer
    }

    /** Make the duel, or settle it at once when a camp or both are empty. */
    #run(fight: DuelFight, teams: ReadonlyMap<string, readonly SavedUnit[]>): void {
        const [first, second] = fight.sides
        if(first.length === 0 || second.length === 0){
            if(first.length === 0 && second.length === 0) this.#called(fight)
            else this.#settle(fight, first.length === 0 ? 1 : 0)
            return
        }
        const partyOf = (id: string): DuelParty => ({ name: id, units: teams.get(id) ?? [] })
        const parties = fight.sides.map(side => side.map(partyOf))
        const units: Record<string, readonly string[]> = {}
        let battle: DuelBattle
        try {
            const save = duelSave(parties, this.rng.int(2 ** 31))
            const names = save.units.map(unit => unit.name)
            let offset = 0
            for(const party of parties.flat()){
                units[party.name] = names.slice(offset, offset + party.units.length)
                offset += party.units.length
            }
            const opened = this.battles.open(fight, save, units)
            if(!opened) throw new Error("the battle could not be made.")
            battle = opened
        } catch(error){
            this.faulted.notify(new DuelBuildFault(fight.number, detailOf(error)))
            this.#called(fight)
            return
        }
        const fighting: Fighting = {
            fight, battle, handles: [], observers: [], isDone: false,
        }
        this.#fightings.set(fight.number, fighting)
        for(const id of fight.sides.flat()){
            const player = this.playerOf(id)
            if(!player) continue
            const own = fight.sides[0].includes(id) ? 0 : 1
            const fought: DuelFought = {
                number: fight.number,
                allies: fight.sides[own],
                opponents: fight.sides[1 - own],
            }
            if(this.#late.has(id)){
                // Not there: its units are bots, and the duel is shown to it once it is.
                battle.lost(id)
                let pending = this.#pending.get(fight.number)
                if(!pending) this.#pending.set(fight.number, pending = new Map())
                pending.set(id, { fighting, fought, units: units[id] ?? [] })
                continue
            }
            this.#told.add(id)
            fighting.handles.push(player.fight(fought, units[id] ?? []))
        }
        fighting.observers.push(
            battle.over.add(winner => this.#over(fighting, winner)),
            battle.failed.add(reason => {
                this.faulted.notify(new UnloadableFault("duel", reason))
                this.#called(fight)
            }),
        )
    }

    /** Tell the spectators which duel they watch. */
    #tellWatchers(watchers: ReadonlyMap<string, number>, fights: readonly DuelFight[]): void {
        for(const [id, index] of watchers){
            const fight = fights[index]
            const player = this.playerOf(id)
            // A duel with no battle is called off at once: there is nothing to watch.
            if(!fight || !this.#fightings.has(fight.number) || !player) continue
            this.#told.add(id)
            player.watch({ number: fight.number, sides: fight.sides })
        }
    }

    /** The battle of a duel is over: who won. */
    #over(fighting: Fighting, winner: string|null): void {
        const match = /^Camp (\d+)$/.exec(winner ?? "")
        this.#settle(fighting.fight, match ? Number(match[1]) - 1 : null)
    }

    /** A duel ended: it has a winner, or none. */
    #settle(fight: DuelFight, winner: number|null): void {
        const fighting = this.#fightings.get(fight.number)
        if(fighting){
            if(fighting.isDone) return
            fighting.isDone = true
            this.#release(fighting)
        }
        this.#settledCount++
        if(winner === null) this.drawn.notify(fight)
        else {
            this.decided.notify({
                fight, winner,
                winners: fight.sides[winner],
                losers: fight.sides[1 - winner],
            })
        }
        this.#settled()
    }

    /** A duel is called off: nothing is decided of it. */
    #called(fight: DuelFight): void {
        const fighting = this.#fightings.get(fight.number)
        if(fighting){
            if(fighting.isDone) return
            fighting.isDone = true
            this.#release(fighting)
        }
        this.#settledCount++
        this.#settled()
    }

    #settled(): void {
        if(this.#isAllDecided || this.#total === 0 || this.#settledCount < this.#total) return
        this.#isAllDecided = true
        this.allDecided.notify()
    }

    /** Stop hearing the players of a duel. Its battle is still told to a client coming back. */
    #release(fighting: Fighting): void {
        for(const handle of fighting.handles) handle.remove()
        fighting.handles.length = 0
        for(const observer of fighting.observers) observer.remove()
        fighting.observers.length = 0
    }

    #end(fault: Fault): void {
        this.ended.notify(fault)
        this.dispose()
    }
}
