import type { Observer } from "../../sim/base/Observable"
import type { Battle } from "../../sim/battle/Battle"
import type { Run } from "../../sim/run/Run"
import { Possessed, POSSESSED } from "../../sim/status/subs/Possessed"

import { BattleHost } from "../battle/BattleHost"
import { JOIN_TOPIC, PLAN_TOPIC, SEAT_TOPIC } from "../SyncChannel"
import type { SyncLink, SyncPeer, SyncRoom } from "../SyncChannel"
import { writeSeatMessage } from "./SeatMessage"
import { Seats } from "./Seats"
import type { Seatable, SeatMode, SeatPolicy } from "./Seats"

/** A client that came to play. */
interface Guest {
    /** The way to tell it what it plays. */
    readonly seats: SyncLink

    /** What it was last told. */
    told: string
}

/** What a client that plays nothing was told, before anything is said. */
const NO_SEAT = writeSeatMessage({ units: [] })

/**
 * The host of a run played by several clients: it tells each client that came to play what it plays, and has
 * a {@link BattleHost} take in the plans.
 *
 * @remarks
 * A client watching says nothing, and is never given anything. What is told of the run goes through a
 * RunBroadcaster, made after this one, so a battle it sends has its units given already. A seat coming free
 * or taken during a battle counts from the next round: who is waited for never changes within a round, but
 * for those who leave. A bot given to a client is possessed, its deck shuffled, for as long as it is played:
 * the deck of a bot is a loop, which leaves a player no choice.
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

    /**
     * What hears that a plan could not be read or taken in. A failure nobody hears is thrown, so it is never
     * silent.
     */
    public get onError(): ((error: unknown) => void)|null { return this.#battle.onError }

    public set onError(onError: ((error: unknown) => void)|null){
        this.#battle.onError = onError
    }

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
        this.#room = [room.onJoin(peer => this.#greet(peer)), room.onLeave(peer => this.#part(peer))]
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
        for(const handle of this.#room) handle.dispose()
        for(const handles of this.#listening.values()) for(const handle of handles) handle.dispose()
        this.#battle.dispose()
    }


    readonly #seats: Seats
    readonly #battle: BattleHost
    readonly #room: readonly { dispose(): void }[]

    /** The clients that came to play, in the order they came, by their ids. */
    readonly #guests = new Map<string, Guest>()

    /** What it hears from each client connected. */
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

    /** Listen to a client connecting: it may say it came to play. */
    #greet(peer: SyncPeer): void {
        const join = JOIN_TOPIC.link(peer).listen(() => this.#welcome(peer))
        this.#listening.set(peer.id, [join])
    }

    /** Take a client that came to play in, given something at once unless a battle is being fought. */
    #welcome(peer: SyncPeer): void {
        if(this.#guests.has(peer.id)) return
        this.#guests.set(peer.id, { seats: SEAT_TOPIC.link(peer), told: NO_SEAT })
        const plans = PLAN_TOPIC.link(peer).listen(text => this.#battle.receive(peer.id, text))
        this.#listening.get(peer.id)?.push(plans)
        if(!this.#engine.battle) this.#deal()
    }

    /** Let a client go, what it played given back: the round goes on without it. */
    #part({ id }: SyncPeer): void {
        for(const handle of this.#listening.get(id) ?? []) handle.dispose()
        this.#listening.delete(id)
        if(!this.#guests.delete(id)) return
        this.#battle.fillIn(id)
        const { battle } = this.#engine
        for(const name of this.#seats.unitsOf(id)){
            const unit = battle?.units.find(each => each.name === name)
            if(!unit || !this.#handed.delete(name)) continue
            battle?.control(unit, "bot")
            battle?.removeStatus(unit, POSSESSED)
        }
        this.#seats.drop(id)
        this.#battle.left(id)
    }

    /** Give the seats for a battle that starts, then host it. */
    #enterBattle(battle: Battle): void {
        this.#handed.clear()
        this.#seats.mode.enterBattle(this.#seats)
        this.#reseat()
        for(const unit of battle.units){
            if(!this.isGuests(unit) || unit.controller !== "bot") continue
            battle.control(unit, "player")
            battle.applyStatus(unit, new Possessed())
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
        const run = this.#engine
        const seats = this.#seats
        seats.mode.seatHost(seats, run)
        for(const id of this.#guests.keys()) seats.seat(id, run)
        for(const [id, guest] of this.#guests){
            const text = writeSeatMessage({ units: seats.unitsOf(id) })
            if(text === guest.told) continue
            guest.told = text
            guest.seats.send(text)
        }
    }
}
