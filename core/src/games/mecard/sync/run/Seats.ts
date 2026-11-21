import type { Fault } from "../../../../engine/net/Fault"
import type { Rng } from "../../sim/base/Rng"
import type { Run } from "../../sim/run/Run"

import { NotCandidateFault, NotHeldFault, SeatTakenFault } from "../faults"

/** What can be given to someone to play, by its name: the units of a battle are made anew at each load. */
export interface Seatable {
    readonly name: string
}

/**
 * What the clients connected to a host are given to play.
 *
 * @typeParam C - What the mode draws its candidates from: the run of the host for the modes that play it, the
 *   places of a race for a mode that has no run to give.
 */
export interface SeatMode<C = Run> {
    /** What may be given now. */
    candidates(context: C): readonly Seatable[]

    /** Take what the host keeps for itself, once seats are given out. */
    seatHost(seats: Seats<C>, context: C): void

    /** Prepare the seats for a battle that starts. */
    enterBattle(seats: Seats<C>): void
}

/** The clients play the heroes of the players by the side of the host, who keeps one. */
export const COOP_SEATS: SeatMode = {
    candidates: run => run.heroes.filter(hero => hero.controller === "player"),
    seatHost: (seats, run) => seats.seatHost(run),
    enterBattle: () => {},
}

/**
 * The clients play the enemies, drawn anew at each battle, the host the whole party. An enemy can be given
 * until the first round only: from then on the battle plans it as a bot.
 */
export const ENEMY_SEATS: SeatMode = {
    candidates: ({ battle, monstersTeam }) => {
        if(!battle || battle.round > 0) return []
        return battle.units.filter(unit => unit.team === monstersTeam && unit.decisive)
    },
    seatHost: () => {},
    enterBattle: seats => seats.clear(),
}

/**
 * Every unit belongs to the client that brought it, given with {@link Seats.assign} and never chosen: there
 * is nothing to give out, to keep for the host or to prepare, and the battle is hosted as it is.
 */
export const OWN_UNITS: SeatMode = {
    candidates: () => [],
    seatHost: () => {},
    enterBattle: () => {},
}

/** Who held a seat before it was freed, and since when. */
export interface FormerHolder {
    readonly id: string

    /** The time it was freed at, by the clock of the {@link Seats}. */
    readonly since: number
}

/** How a seat is picked among those free. */
export interface SeatPolicy {
    /**
     * The seat taken among those free, none when none suits. The seats kept for another are not among them.
     *
     * @param who - The client the seat is for.
     * @param former - Who held each seat last, for a seat that was freed.
     */
    pick(free: readonly Seatable[], who?: string, former?: ReadonlyMap<string, FormerHolder>): Seatable|null
}

/** No seat is given by itself: what the clients ask for, and are given, fills the seats. */
export const NO_PICK: SeatPolicy = { pick: () => null }

/** The first seat free. */
export const FIXED_SEATS: SeatPolicy = { pick: free => free[0] ?? null }

/** The seat the client held last when it is free, then the first one free: who left comes back to its place. */
export const FORMER_FIRST: SeatPolicy = {
    pick: (free, who, former) => free.find(each => former?.get(each.name)?.id === who) ?? free[0] ?? null,
}

/**
 * Any seat free.
 *
 * @param rng - What it draws from, its own: the numbers of the run are the simulation's.
 */
export function randomSeats(rng: Rng): SeatPolicy {
    return { pick: free => rng.pick(free) ?? null }
}

/** What a {@link Seats} is made with, besides its mode and its policy. */
export interface SeatOptions {
    /** The time, in milliseconds: when a seat was freed is read from it. */
    readonly clock?: () => number

    /** How long a seat that was freed is kept for the client that held it, in milliseconds. None by default. */
    readonly reserveMs?: number
}

/**
 * Who plays what among the clients of a host, a client by its id. What nobody holds is the host's, and the
 * seat of the host only keeps it from being given.
 *
 * @remarks
 * A seat is a role, which a client holds for a while: the client keeps what is its own, and the mode ties the
 * seat to whoever holds it. A seat freed is remembered as the one of the client that left, and may be kept for
 * it for a while, then given to anyone.
 */
export class Seats<C = Run> {


    constructor(
        public readonly mode: SeatMode<C>,
        public readonly policy: SeatPolicy,
        options: SeatOptions = {},
    ){
        this.#clock = options.clock ?? (() => 0)
        this.#reserveMs = options.reserveMs ?? 0
    }


    /** The client holding a seat, none when it is not a client's. */
    public holderOf(name: string): string|null {
        return this.#held.get(name) ?? null
    }

    /** The seats a client holds. */
    public unitsOf(guest: string): string[] {
        return [...this.#held].filter(([, holder]) => holder === guest).map(([name]) => name)
    }

    /** Who held a seat last, none when it was never freed, or has been given again since. */
    public formerOf(name: string): FormerHolder|null {
        return this.#former.get(name) ?? null
    }

    /** The seats nobody holds, those kept for someone that left included. */
    public vacant(context: C): readonly Seatable[] {
        return this.mode.candidates(context).filter(each => !this.#held.has(each.name) && each.name !== this.#host)
    }

    /** Is a seat kept for another client, which left it not long ago? */
    public isReservedAgainst(name: string, guest: string): boolean {
        const former = this.#former.get(name)
        return former !== undefined && former.id !== guest && this.#clock() - former.since < this.#reserveMs
    }

    /** Give a client a free seat, when it holds none. With none free, it stays without. */
    public seat(guest: string, context: C): void {
        if(this.unitsOf(guest).length > 0) return
        const free = this.#free(context).filter(each => !this.isReservedAgainst(each.name, guest))
        const picked = this.policy.pick(free, guest, this.#former)
        if(!picked) return
        this.#held.set(picked.name, guest)
        this.#former.delete(picked.name)
    }

    /**
     * Give a client a seat it asked for, when it is free and may be given. A client holding another seat
     * gives it up for this one: it is an exchange, a client plays one seat.
     *
     * @returns Why it could not be given, none when it was.
     */
    public claim(guest: string, name: string, context: C): Fault|null {
        const isCandidate = this.mode.candidates(context).some(each => each.name === name)
        if(!isCandidate) return new NotCandidateFault(guest, name)
        if(this.#host === name) return new SeatTakenFault(guest, name, null)
        const holder = this.#held.get(name)
        if(holder !== undefined && holder !== guest) return new SeatTakenFault(guest, name, holder)
        // A seat freed not long ago is kept for who held it.
        if(this.isReservedAgainst(name, guest)){
            return new SeatTakenFault(guest, name, this.#former.get(name)?.id ?? null)
        }
        this.drop(guest)
        this.#held.set(name, guest)
        this.#former.delete(name)
        return null
    }

    /**
     * Free a seat a client holds.
     *
     * @returns Why it could not be, none when it was.
     */
    public release(guest: string, name: string): Fault|null {
        if(this.#held.get(name) !== guest) return new NotHeldFault(guest, name)
        this.#held.delete(name)
        this.#former.set(name, { id: guest, since: this.#clock() })
        return null
    }

    /** Give a client the units it brought, whatever the mode would give out: it is theirs, not a choice. */
    public assign(guest: string, names: readonly string[]): void {
        for(const name of names){
            this.#held.set(name, guest)
            this.#former.delete(name)
        }
    }

    /** Keep a free seat for the host, when it keeps none yet. */
    public seatHost(context: C): void {
        if(this.#host !== null) return
        this.#host = this.policy.pick(this.#free(context))?.name ?? null
    }

    /** Free the seats of a client: they are remembered as its, to be kept for it for a while. */
    public drop(guest: string): void {
        for(const name of this.unitsOf(guest)){
            this.#held.delete(name)
            this.#former.set(name, { id: guest, since: this.#clock() })
        }
    }

    /** Free the seats a test accepts, whoever holds them, and forget who held them. The host's own stays. */
    public freeIf(isFreed: (name: string) => boolean): void {
        for(const name of [...this.#held.keys()]) if(isFreed(name)) this.#held.delete(name)
        for(const name of [...this.#former.keys()]) if(isFreed(name)) this.#former.delete(name)
    }

    /** Free every seat, and forget who held them. */
    public clear(): void {
        this.#held.clear()
        this.#former.clear()
        this.#host = null
    }

    /** Free the seats that may not be held anymore. */
    public prune(context: C): void {
        const names = new Set(this.mode.candidates(context).map(each => each.name))
        for(const name of [...this.#held.keys()]) if(!names.has(name)) this.#held.delete(name)
        for(const name of [...this.#former.keys()]) if(!names.has(name)) this.#former.delete(name)
        if(this.#host !== null && !names.has(this.#host)) this.#host = null
    }


    /** The client holding each seat. */
    readonly #held = new Map<string, string>()

    /** Who held each seat that was freed, until it is given again. */
    readonly #former = new Map<string, FormerHolder>()

    /** The seat the host keeps for itself, none when it keeps none. */
    #host: string|null = null

    readonly #clock: () => number
    readonly #reserveMs: number

    #free(context: C): Seatable[] {
        const taken = (name: string): boolean => this.#held.has(name) || name === this.#host
        return this.mode.candidates(context).filter(each => !taken(each.name))
    }
}
