import type { SyncRoom } from "../../../../platform"
import type { Fault } from "../../../../engine/net/Fault"
import type { Observer } from "../../sim/base/Observable"
import type { Battle } from "../../sim/battle/Battle"
import type { Run } from "../../sim/run/Run"
import { POSSESSED } from "../../sim/status/subs/Possessed"

import { BattleHost } from "../battle/BattleHost"
import { forward, signal } from "../faults"
import { Gathering, MANUAL } from "../Gathering"
import type { Member } from "../Gathering"
import { PLAN_TOPIC } from "../SyncChannel"
import { SeatDealer } from "./SeatDealer"
import { Seats } from "./Seats"
import type { Seatable, SeatMode, SeatPolicy } from "./Seats"

/**
 * The host of a run played by several clients: it tells each client that came to play what it plays, and has
 * a {@link BattleHost} take in the plans.
 *
 * @remarks
 * It is made of a {@link Gathering} that welcomes whoever comes, a {@link SeatDealer} that tells each client
 * what it plays, and a {@link BattleHost}; what it keeps is the bots it hands to a client.
 *
 * A client watching says nothing, and is never given anything. What is told of the run goes through a
 * RunBroadcaster, made after this one, so a battle it sends has its units given already. A seat coming free
 * or taken during a battle counts from the next round: who is waited for never changes within a round, but
 * for those who leave. A bot given to a client is possessed, its deck shuffled, for as long as it is played:
 * the deck of a bot is a loop, which leaves a player no choice.
 *
 * A client whose connection is lost keeps its seats, and its units are played as bots until it is back.
 */
export class RunHost {


    /** The run hosted. */
    public get engine(): Run { return this.#engine }

    /** Host another run in place of this one, every seat given anew. */
    public set engine(run: Run){
        this.#unregisterObservers()
        this.#leaveBattle()
        this.#seats.clear()
        this.#engine = run
        this.#registerObservers()
        this.#reseat()
    }

    /** Told of what was dealt with: a plan that could not be read or taken in, a client turned away. */
    public readonly faulted = signal<Fault>()

    /** Who plays what, which a {@link SeatChoice} changes when a client asks. */
    public get seats(): Seats { return this.#seats }

    /** What tells each client what it plays. */
    public get dealer(): SeatDealer { return this.#dealer }

    /** Told of each client that came to play. */
    public readonly guestJoined = signal<string>()

    /** Told of each client that left for good. */
    public readonly guestLeft = signal<string>()

    constructor(
        engine: Run,

        /** The clients connected. */
        room: SyncRoom,

        mode: SeatMode,

        policy: SeatPolicy,

        /** Told once a round when the host and every client it waits for are ready. */
        everyoneReady: () => void,
    ){
        this.#engine = engine
        this.#seats = new Seats(mode, policy)
        this.#battle = new BattleHost(null, this.#seats, everyoneReady)
        this.#dealer = new SeatDealer(this.#seats, room)
        this.#gathering = new Gathering(room, MANUAL)
        this.#forwarding = [forward(this.#battle, this, false), forward(this.#gathering, this, false)]
        this.#room = [
            this.#gathering.memberJoined.add(member => this.#welcome(member)),
            this.#gathering.memberLeft.add(member => this.#part(member)),
        ]
        this.#lifelines = [
            room.onLost(peer => this.#battle.lost(peer.id)),
            room.onBack(peer => this.#battle.back(peer.id)),
        ]
        this.#registerObservers()
        this.#reseat()
    }


    /** Is a unit played by a client? */
    public isGuests(unit: Seatable): boolean {
        return this.#seats.holderOf(unit.name) !== null
    }

    /** Hear that the host is ready. */
    public ready(): void {
        this.#battle.ready()
    }

    /** Stop hosting the run. */
    public dispose(): void {
        this.#unregisterObservers()
        this.#leaveBattle()
        for(const observer of this.#room) observer.remove()
        for(const handle of this.#lifelines) handle.dispose()
        for(const handle of this.#forwarding) handle.dispose()
        for(const handles of this.#listening.values()) for(const handle of handles) handle.dispose()
        this.#gathering.dispose()
        this.#dealer.dispose()
        this.#battle.dispose()
    }


    readonly #seats: Seats
    readonly #battle: BattleHost
    readonly #dealer: SeatDealer
    readonly #gathering: Gathering
    readonly #forwarding: readonly { dispose(): void }[]
    readonly #room: readonly Observer[]
    readonly #lifelines: readonly { dispose(): void }[]

    /** What it hears from each client that came to play. */
    readonly #listening = new Map<string, { dispose(): void }[]>()

    /** The units of the battle that are bots but for the client playing them, by their names. */
    readonly #handed = new Set<string>()

    #engine: Run

    #observers: Observer[] = []

    /** What it listens to on the battle being fought. */
    #battleObservers: Observer[] = []

    #registerObservers(): void {
        const run = this.#engine
        this.#observers = [
            run.battleStarted.add(battle => this.#enterBattle(battle)),
            run.heroJoined.add(() => this.#reseat()),
            run.heroLeft.add(() => this.#reseat()),
            run.phaseChanged.add(phase => {
                if(phase !== "travel") return
                this.#leaveBattle()
                this.#deal()
            }),
        ]
    }

    #unregisterObservers(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers = []
    }

    /** Take a client that came to play in, given something at once unless a battle is being fought. */
    #welcome({ id, peer }: Member): void {
        // A run is hosted for clients only: a member playing on the host itself has no seat to be dealt.
        if(!peer) return
        this.#dealer.add(peer)
        const plans = PLAN_TOPIC.link(peer).listen(text => this.#battle.receive(id, text))
        this.#listening.set(id, [plans])
        this.guestJoined.notify(id)
        if(!this.#engine.battle) this.#deal()
    }

    /** Let a client go, what it played given back: the round goes on without it. */
    #part({ id }: Member): void {
        for(const handle of this.#listening.get(id) ?? []) handle.dispose()
        this.#listening.delete(id)
        if(!this.#dealer.has(id)) return
        this.#battle.fillIn(id)
        const { battle } = this.#engine
        for(const name of this.#seats.unitsOf(id)){
            const unit = battle?.units.find(each => each.name === name)
            if(!unit || !this.#handed.delete(name)) continue
            battle?.control(unit, "bot")
            battle?.removeStatus(unit, POSSESSED)
        }
        this.#dealer.remove(id)
        this.#battle.gone(id)
        this.guestLeft.notify(id)
    }

    /** Give the seats for a battle that starts, then host it. */
    #enterBattle(battle: Battle): void {
        this.#handed.clear()
        this.#seats.mode.enterBattle(this.#seats)
        this.#reseat()
        for(const unit of battle.units){
            if(!this.isGuests(unit) || unit.controller === "player") continue
            battle.control(unit, "player")
            battle.applyStatus(unit, POSSESSED, 1)
            battle.reshuffle(unit)
            this.#handed.add(unit.name)
        }
        this.#battle.engine = battle
        this.#battleObservers = [battle.roundStarted.add(() => this.#deal())]
    }

    #leaveBattle(): void {
        for(const observer of this.#battleObservers) observer.remove()
        this.#battleObservers = []
        this.#battle.engine = null
    }

    /** Free the seats that may not be held anymore, then give them out. */
    #reseat(): void {
        this.#seats.prune(this.#engine)
        this.#deal()
    }

    /** Give a seat to whoever has none, the host first, then tell those whose seats changed. */
    #deal(): void {
        this.#dealer.deal(this.#engine)
    }
}
