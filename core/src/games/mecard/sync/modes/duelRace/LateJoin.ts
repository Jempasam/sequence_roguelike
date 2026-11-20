/** How a race stands when someone comes after it started: what a rule of coming late reads. */
export interface RaceState {
    /** How many rounds of duels were fought. */
    readonly rounds: number

    /** Did a player arrive at the duels, so the others are being waited for there? */
    readonly arrivalStarted: boolean

    /** The lives of the players still in. */
    readonly lives: readonly number[]
}

/**
 * Whether someone may come to a race that started, as a player of its own, and with what: polymorphic, so a mode
 * chooses. Someone that may not only watches.
 *
 * @remarks
 * A player never takes the place of another: the run and the team of a player live on its client, and a place
 * without them is worth nothing. A newcomer plays with a run of its own, from the start of the map.
 */
export interface LateJoin {
    /** May someone come now, as a player? */
    admits(state: RaceState): boolean

    /** The lives it starts with. */
    lives(state: RaceState): number
}

/**
 * Someone may come as long as no player arrived at the duels, with as many lives as the player with the fewest:
 * it is no better off than who is about to lose.
 */
export const UNTIL_FIRST_ARRIVAL: LateJoin = {
    admits: state => !state.arrivalStarted,
    lives: state => Math.max(1, Math.min(...state.lives)),
}

/** Nobody comes to a race that started. */
export const NEVER: LateJoin = {
    admits: () => false,
    lives: () => 0,
}
