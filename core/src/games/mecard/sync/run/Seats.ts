import type { Rng } from "../../sim/base/Rng"
import type { Run } from "../../sim/run/Run"

/** What can be given to someone to play, by its name: the units of a battle are made anew at each load. */
export interface Seatable {
    readonly name: string
}

/** What the clients connected to a host are given to play. */
export interface SeatMode {
    /** What may be given now. */
    candidates(run: Run): readonly Seatable[]

    /** Take what the host keeps for itself, once seats are given out. */
    seatHost(seats: Seats, run: Run): void

    /** Prepare the seats for a battle that starts. */
    enterBattle(seats: Seats): void
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
        return battle.units.filter(unit => unit.team === monstersTeam && unit.character)
    },
    seatHost: () => {},
    enterBattle: seats => seats.clear(),
}

/** How a seat is picked among those free. */
export interface SeatPolicy {
    /** The seat taken among those free, none when none suits. */
    pick(free: readonly Seatable[]): Seatable|null
}

/** The first seat free. */
export const FIXED_SEATS: SeatPolicy = { pick: free => free[0] ?? null }

/**
 * Any seat free.
 *
 * @param rng - What it draws from, its own: the numbers of the run are the simulation's.
 */
export function randomSeats(rng: Rng): SeatPolicy {
    return { pick: free => rng.pick(free) ?? null }
}

/**
 * Who plays what among the clients of a host, a client by its id. What nobody holds is the host's, and the
 * seat of the host only keeps it from being given.
 */
export class Seats {


    constructor(
        public readonly mode: SeatMode,
        public readonly policy: SeatPolicy,
    ){}


    /** The client holding a seat, none when it is not a client's. */
    public holderOf(name: string): string|null {
        return this.#held.get(name) ?? null
    }

    /** The seats a client holds. */
    public unitsOf(guest: string): string[] {
        return [...this.#held].filter(([, holder]) => holder === guest).map(([name]) => name)
    }

    /** Give a client a free seat, when it holds none. With none free, it stays without. */
    public seat(guest: string, run: Run): void {
        if(this.unitsOf(guest).length > 0) return
        const picked = this.policy.pick(this.#free(run))
        if(picked) this.#held.set(picked.name, guest)
    }

    /** Keep a free seat for the host, when it keeps none yet. */
    public seatHost(run: Run): void {
        if(this.#host !== null) return
        this.#host = this.policy.pick(this.#free(run))?.name ?? null
    }

    /** Free the seats of a client. */
    public drop(guest: string): void {
        for(const name of this.unitsOf(guest)) this.#held.delete(name)
    }

    /** Free every seat. */
    public clear(): void {
        this.#held.clear()
        this.#host = null
    }

    /** Free the seats that may not be held anymore. */
    public prune(run: Run): void {
        const names = new Set(this.mode.candidates(run).map(each => each.name))
        for(const name of [...this.#held.keys()]) if(!names.has(name)) this.#held.delete(name)
        if(this.#host !== null && !names.has(this.#host)) this.#host = null
    }


    /** The client holding each seat. */
    readonly #held = new Map<string, string>()

    /** The seat the host keeps for itself, none when it keeps none. */
    #host: string|null = null

    #free(run: Run): Seatable[] {
        const taken = (name: string): boolean => this.#held.has(name) || name === this.#host
        return this.mode.candidates(run).filter(each => !taken(each.name))
    }
}
