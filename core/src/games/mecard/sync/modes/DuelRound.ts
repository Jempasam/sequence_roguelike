import type { SyncPeer, SyncRoom } from "../../../../platform"
import { Fault } from "../../../../engine/net/Fault"
import type { Observer } from "../../sim/base/Observable"
import type { Rng } from "../../sim/base/Rng"
import type { Battle } from "../../sim/battle/Battle"
import { duelSave } from "../../sim/duel/duelBattle"
import type { DuelParty } from "../../sim/duel/duelBattle"
import { loadBattle } from "../../sim/save/battleSave"
import type { BattleSave, SavedUnit } from "../../sim/save/battleSave"

import { BattleBroadcaster } from "../battle/BattleBroadcaster"
import { BattleHost } from "../battle/BattleHost"
import { NO_PICK, OWN_UNITS, Seats } from "../run/Seats"
import type { SyncSender } from "../SyncChannel"
import { DuelBuildFault, NotEnoughPlayersFault, PeerGoneFault, signal, UnloadableFault } from "../faults"
import { detailOf } from "../read"
import type { Matched, Matching } from "./Matching"
import type { DuelPlayer } from "./players/DuelPlayer"
import { duelBattleTopic } from "./topics"

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

/**
 * Where the battles of the duels are made, when they are not told by a broadcaster of the round: a game that holds
 * its battles itself, as a game of the runner does.
 */
export interface DuelBattles {
    /** Make the battle of a duel from its save, none when it cannot be made. */
    open(fight: DuelFight, save: BattleSave): Battle|null

    /** The duel is over for the clients that followed it. */
    close(fight: DuelFight): void
}

/** A duel being fought. */
interface Fighting {
    readonly fight: DuelFight
    readonly battle: Battle
    readonly host: BattleHost
    readonly seats: Seats
    readonly broadcaster: BattleBroadcaster|null
    readonly handles: { dispose(): void }[]
    readonly observers: Observer[]

    /** The players that left for good. */
    readonly gone: Set<string>

    /** Is the hub advancing the battle already? A round that is ready while it does goes on after it. */
    isStepping: boolean
    isAgain: boolean

    /** Was the duel settled: decided, drawn, or called off? */
    isDone: boolean
}

/**
 * One round of duels, on the hub: it makes the players into camps and duels, asks the fighters for their
 * teams, tells every player which duel it fights or watches, and has each duel's battle played from the plans
 * the players give.
 *
 * @remarks
 * It knows no rules of what a duel is worth: it tells how each duel ended, and the mode decides. A player
 * whose team cannot be had is left out of its duel, which goes on without it; when a camp is left empty the
 * other wins. A player that leaves for good is played as a bot, and when a whole camp left the other wins. A
 * round that cannot make a duel is over with {@link DuelRound.ended}, nothing decided.
 *
 * Each unit is the player's that brought it, with {@link OWN_UNITS}. It reaches every player through a
 * {@link DuelPlayer}, and never knows how: it advances the battle as soon as everyone is ready, and the
 * players, who have the same battle, play the round from what the hub tells.
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
        room: SyncRoom,
        private readonly sender: SyncSender,

        /** The player of an id, none when it is not there: a client not connected any more. */
        private readonly playerOf: (id: string) => DuelPlayer|null,

        private readonly matching: Matching,

        /** The seeds of the battles are drawn from it. */
        private readonly rng: Rng,

        /**
         * What the number of its first duel is: the numbers of the duels of a mode that plays rounds are told
         * apart from those of the rounds before, so a client never takes a duel for the one it fought.
         */
        private readonly base = 0,

        /** Where the battles are made, none for ones made here and told on the sender. */
        private readonly battles: DuelBattles|null = null,
    ){
        this.#handles = [
            room.onLost(peer => this.#each(peer.id, fighting => fighting.host.lost(peer.id))),
            room.onBack(peer => this.#back(peer)),
            room.onLeave(peer => this.#leave(peer.id)),
        ]
    }


    /** The duels of the round, as they are fought. */
    public get fights(): readonly DuelFight[] {
        return [...this.#fightings.values()].map(({ fight }) => fight)
    }

    /** The battle of a duel, none when it is not fought. */
    public battleOf(number: number): Battle|null {
        return this.#fightings.get(number)?.battle ?? null
    }

    /**
     * Make the round of these players. It resolves once every duel is under way, and never rejects; how they
     * end is told by the observables.
     *
     * @param spectators - The players out of the round, who watch a duel drawn at random: those eliminated.
     */
    public async start(players: readonly string[], spectators: readonly string[] = []): Promise<void> {
        if(this.#isStarted) return
        this.#isStarted = true
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
        for(const fighting of [...this.#fightings.values()]) this.#begin(fighting)
    }

    /** Stop: the duels are left as they are, and nothing is heard or told any more. */
    public dispose(): void {
        this.#isDisposed = true
        for(const handle of this.#handles) handle.dispose()
        for(const fighting of this.#fightings.values()){
            this.#release(fighting)
            fighting.broadcaster?.dispose()
            this.battles?.close(fighting.fight)
        }
        this.#told.clear()
    }


    readonly #handles: readonly { dispose(): void }[]
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
        let battle: Battle
        let names: string[]
        try {
            const save = duelSave(parties, this.rng.int(2 ** 31))
            const opened = this.battles ? this.battles.open(fight, save) : loadBattle(save)
            if(!opened) throw new Error("the battle could not be made.")
            battle = opened
            names = save.units.map(unit => unit.name)
        } catch(error){
            this.faulted.notify(new DuelBuildFault(fight.number, detailOf(error)))
            this.#called(fight)
            return
        }
        const seats = new Seats(OWN_UNITS, NO_PICK)
        let offset = 0
        for(const party of parties.flat()){
            seats.assign(party.name, names.slice(offset, offset + party.units.length))
            offset += party.units.length
        }
        const fighting: Fighting = {
            fight, battle, seats,
            handles: [],
            observers: [],
            gone: new Set(),
            isStepping: false,
            isAgain: false,
            isDone: false,
            host: new BattleHost(battle, seats, () => this.#step(fighting)),
            broadcaster: this.battles ? null : new BattleBroadcaster(battle, duelBattleTopic(fight.number).sender(this.sender)),
        }
        this.#fightings.set(fight.number, fighting)
        for(const id of fight.sides.flat()){
            const player = this.playerOf(id)
            if(!player) continue
            const own = fight.sides[0].includes(id) ? 0 : 1
            this.#told.add(id)
            fighting.handles.push(player.fight({
                number: fight.number,
                allies: fight.sides[own],
                opponents: fight.sides[1 - own],
            }, battle, fighting.host, seats.unitsOf(id)))
        }
        fighting.observers.push(
            fighting.host.faulted.add(fault => this.faulted.notify(fault)),
            battle.phaseChanged.add(phase => {
                if(phase === "preparation") fighting.host.ready()
                else if(phase === "over") this.#over(fighting)
            }),
        )
    }

    /** Tell the spectators which duel they watch. */
    #tellWatchers(watchers: ReadonlyMap<string, number>, fights: readonly DuelFight[]): void {
        for(const [id, index] of watchers){
            const fight = fights[index]
            const battle = fight ? this.battleOf(fight.number) : null
            const player = this.playerOf(id)
            // A duel with no battle is called off at once: there is nothing to watch.
            if(!fight || !battle || !player) continue
            this.#told.add(id)
            player.watch({ number: fight.number, sides: fight.sides }, battle)
        }
    }

    /** The first round of every duel: the battle starts. */
    #begin(fighting: Fighting): void {
        if(fighting.isDone) return
        this.#step(fighting)
    }

    /** Play what is ready of a duel: the round, then the draw of the next, until a player is waited for. */
    #step(fighting: Fighting): void {
        if(fighting.isStepping){
            fighting.isAgain = true
            return
        }
        fighting.isStepping = true
        try {
            do {
                fighting.isAgain = false
                if(fighting.isDone || fighting.battle.phase === "over") break
                this.#advance(fighting)
            } while(fighting.isAgain)
        } finally {
            fighting.isStepping = false
        }
    }

    #advance(fighting: Fighting): void {
        const { battle, seats } = fighting
        try {
            // A unit nobody plays, a body summoned, is planned as a bot rather than waited for.
            for(const unit of battle.awaited.units){
                if(seats.holderOf(unit.name) === null) battle.commitPlan(unit, battle.planAsBot(unit))
            }
            if(battle.phase === "preparation" && battle.awaited.units.length > 0) return
            battle.advance()
            if(battle.phase === "draw") battle.advance()
        } catch(error){
            this.faulted.notify(new UnloadableFault("duel", detailOf(error)))
            this.#called(fighting.fight)
        }
    }

    /** The battle of a duel is over: who won. */
    #over(fighting: Fighting): void {
        const { winner } = fighting.battle
        const match = /^Camp (\d+)$/.exec(winner?.name ?? "")
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

    /**
     * A player left the game while staying in the room, which the round does not hear of from the room: its units
     * are played as bots, as for one that left for good, and a camp that left altogether loses.
     */
    public leave(id: string): void {
        this.#leave(id)
    }

    /** Stop hearing the players of a duel. Its battle is still told to a client coming back. */
    #release(fighting: Fighting): void {
        for(const handle of fighting.handles) handle.dispose()
        fighting.handles.length = 0
        for(const observer of fighting.observers) observer.remove()
        fighting.observers.length = 0
        fighting.host.dispose()
    }

    #each(id: string, run: (fighting: Fighting) => void): void {
        for(const fighting of this.#fightings.values()){
            if(!fighting.isDone && fighting.fight.sides.some(side => side.includes(id))) run(fighting)
        }
    }

    #back(peer: SyncPeer): void {
        this.#each(peer.id, fighting => fighting.host.back(peer.id))
        if(this.#told.has(peer.id)) this.playerOf(peer.id)?.back()
    }

    /** A player left for good: its units are played as bots, and a camp that left altogether loses. */
    #leave(id: string): void {
        this.#each(id, fighting => {
            fighting.gone.add(id)
            fighting.host.fillIn(id)
            for(const name of fighting.seats.unitsOf(id)){
                const unit = fighting.battle.units.find(each => each.name === name)
                if(unit) fighting.battle.control(unit, "bot")
            }
            fighting.seats.drop(id)
            fighting.host.gone(id)
            const hasLeft = (each: string): boolean => fighting.gone.has(each)
            const emptied = fighting.fight.sides.findIndex(side => side.every(hasLeft))
            if(emptied >= 0) this.#settle(fighting.fight, 1 - emptied)
        })
    }

    #end(fault: Fault): void {
        this.ended.notify(fault)
        this.dispose()
    }
}
