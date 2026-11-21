import type { Observer } from "../../../base/Observable"
import { Rng } from "../../../base/Rng"
import type { Battle } from "../../../battle/Battle"
import type { Run } from "../../../run/Run"
import { POSSESSED } from "../../../status/subs/Possessed"
import { BattleHost } from "../../../../sync/battle/BattleHost"
import { FIXED_SEATS, randomSeats, Seats } from "../../../../sync/run/Seats"
import type { Seatable, SeatMode } from "../../../../sync/run/Seats"
import type { GameBench } from "../../GameBench"
import type { GameMember } from "../../GameMember"
import type { HandleChannel } from "../../HandleChannel"

import { sidedSeats } from "./tableSeats"
import type { Side } from "./tableSeats"

/**
 * The run of this client, and what shows it: the run it makes is plugged to the screen, the sounds and the
 * rest, and the game keeps it for its handles to hold, whether it owns it or follows it.
 */
export interface ClientRuns extends GameBench {
    /** Make the run of this client, which no screen shows yet: its own, or a replica of the owner's. */
    create(seed: number): Run

    /**
     * Show the run the table plays to its owner: it plays what no client does, and starts the rounds. Said
     * again whenever who plays what changes.
     *
     * @param isGuests - Is a unit played by a client?
     * @param ready - Said when the owner is ready.
     * @param over - Said when the party fell and the owner leaves it.
     */
    showOwned(run: Run, isGuests: (unit: Seatable) => boolean, ready: () => void, over: () => void): void

    /**
     * Show the run to a client, which plays the units it is given and only watches with none. Said again
     * whenever they change.
     */
    showSeat(run: Run, units: readonly string[], ready: () => void): void

    /**
     * Start the round of the battle on the screen of the owner: it and every client it waits for are ready.
     */
    startRound(): void

    /** Take the run off the screen. */
    hideRun(): void
}

/**
 * What the manager says to the owner of the table: a client came to play, or left, lost its connection or is
 * back (the game says the three last by itself). One of them at a time.
 */
export type OwnerOrder = {
    readonly joined?: { readonly id: string, readonly side: Side }
    readonly left?: string
    readonly lost?: string
    readonly back?: string
}

/**
 * What the owner of the table says to the manager: who plays which units, by client, or that the party fell.
 * One of them at a time.
 */
export type OwnerSaid = {
    readonly seating?: { readonly [id: string]: readonly string[] }
    readonly over?: true
}

/** What differs among the kinds of table: what the clients are given, and how. */
export interface TableRules {
    readonly seatMode: SeatMode

    /** Are the places given at random? */
    readonly isRandom: boolean

    /** Does each client choose its side? */
    readonly isSided: boolean
}

/**
 * The table as its owner holds it: the run, who plays which of its units, and the battle they plan together.
 * It is the engine's side of the table, and tells the manager no more than who plays what.
 *
 * @remarks
 * It sleeps until the run is shown to the owner. What the manager said before is kept, and said again to it
 * then.
 */
export class TableOwner {


    constructor(
        private readonly run: Run,
        rules: TableRules,
        private readonly bench: ClientRuns,

        /** The way to the manager. */
        private readonly manager: HandleChannel,
        seed: number,
    ){
        const places = rules.isRandom ? randomSeats(new Rng(seed)) : FIXED_SEATS
        const policy = rules.isSided ? sidedSeats(who => this.#sideOf(who), places) : places
        this.#seats = new Seats(rules.seatMode, policy)
        this.#battle = new BattleHost(null, this.#seats, () => this.bench.startRound())
    }


    /** The run is shown to the owner, or shown again. */
    public show(): void {
        this.#ownerTold = ""
        if(this.#isStarted){
            this.#deal()
            return
        }
        this.#isStarted = true
        this.#observers = [
            this.run.battleStarted.add(battle => this.#enterBattle(battle)),
            this.run.heroJoined.add(() => this.#reseat()),
            this.run.heroLeft.add(() => this.#reseat()),
            this.run.phaseChanged.add(phase => {
                if(phase !== "travel") return
                this.#leaveBattle()
                this.#deal()
            }),
        ]
        this.#reseat()
        for(const order of this.#pending.splice(0)) this.order(order)
    }

    /** The run is taken away from the owner. */
    public hide(): void {
        for(const observer of [...this.#observers, ...this.#battleObservers]) observer.remove()
        this.#observers = []
        this.#battleObservers = []
        this.#battle.dispose()
        this.#isStarted = false
    }

    /** The manager says a client came, left, lost its connection or is back. */
    public order(order: OwnerOrder): void {
        if(!this.#isStarted){
            this.#pending.push(order)
            return
        }
        if(order.joined) this.#join(order.joined.id, order.joined.side)
        if(order.left !== undefined) this.#part(order.left)
        if(order.lost !== undefined) this.#battle.lost(order.lost)
        if(order.back !== undefined) this.#battle.back(order.back)
    }

    /** A client says what it plans, once it is ready. */
    public heard(from: GameMember|null, plan: unknown): boolean {
        if(!from || !this.#guests.has(from.id)) return false
        this.#battle.receive(from.id, JSON.stringify(plan))
        return true
    }

    /** The owner is ready. */
    public ready(): void {
        this.#battle.ready()
    }


    #isStarted = false
    readonly #seats: Seats
    readonly #battle: BattleHost
    #observers: Observer[] = []
    #battleObservers: Observer[] = []
    readonly #pending: OwnerOrder[] = []

    /** The ids of the clients that came to play, and the side each chose. */
    readonly #guests = new Set<string>()
    readonly #sides = new Map<string, Side>()

    /** What the owner and the manager were last told, to say it again only when it changed. */
    #ownerTold = ""
    #seatingTold = ""

    /** The units of the battle that are bots but for the client playing them, by their names. */
    readonly #handed = new Set<string>()

    #sideOf(who: string|undefined): Side {
        return (who === undefined ? undefined : this.#sides.get(who)) ?? "allié"
    }

    #join(id: string, side: Side): void {
        this.#sides.set(id, side)
        this.#guests.add(id)
        if(!this.run.battle) this.#deal()
        else this.#tell()
    }

    /** Let a client go, what it played given back: the round goes on without it. */
    #part(id: string): void {
        if(!this.#guests.delete(id)) return
        this.#battle.fillIn(id)
        const { battle } = this.run
        for(const name of this.#seats.unitsOf(id)){
            const unit = battle?.units.find(each => each.name === name)
            if(!unit || !this.#handed.delete(name)) continue
            battle?.control(unit, "bot")
            battle?.removeStatus(unit, POSSESSED)
        }
        this.#seats.drop(id)
        this.#battle.gone(id)
        this.#tell()
    }

    /** Give the seats for a battle that starts, then host it. */
    #enterBattle(battle: Battle): void {
        const seats = this.#seats
        this.#handed.clear()
        seats.mode.enterBattle(seats)
        this.#reseat()
        for(const unit of battle.units){
            if(seats.holderOf(unit.name) === null || unit.controller === "player") continue
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
        this.#seats.prune(this.run)
        this.#deal()
    }

    /** Give a seat to whoever has none, the owner first, then tell who plays what. */
    #deal(): void {
        const seats = this.#seats
        seats.mode.seatHost(seats, this.run)
        for(const id of this.#guests) seats.seat(id, this.run)
        this.#tell()
    }

    /** Tell the manager which units each client plays, and the owner which it does not play. */
    #tell(): void {
        const seats = this.#seats
        const seating: Record<string, readonly string[]> = {}
        for(const id of this.#guests) seating[id] = seats.unitsOf(id)
        const seatingText = JSON.stringify(seating)
        if(seatingText !== this.#seatingTold){
            this.#seatingTold = seatingText
            this.manager.notify({ seating } satisfies OwnerSaid)
        }
        const locked = Object.values(seating).flat()
        const lockedText = JSON.stringify(locked)
        if(lockedText === this.#ownerTold) return
        this.#ownerTold = lockedText
        const names = new Set<string>(locked)
        const over = (): void => void this.manager.notify({ over: true } satisfies OwnerSaid)
        this.bench.showOwned(this.run, unit => names.has(unit.name), () => this.ready(), over)
    }
}
