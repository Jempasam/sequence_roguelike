/** A number of cards from `min` to `max`, both included. */
export interface Range {
    readonly min: number
    readonly max: number
}

/** A range from `min` to `max`. */
export function range(min: number, max: number): Range {
    return { min, max }
}

/**
 * How long each part of what is built is: asked by the target of a conversion, never fixed by the analysis.
 * Every target brings its own defaults, and a caller may change any of them.
 */
export interface Sizes {
    /** The cards of the run of a beast, or of the approach of a monster. */
    readonly run: Range

    /** The cards of the bite of a beast, or of the attack of a monster. */
    readonly bite: Range

    /** The cards of the main chain, as a module holds them. */
    readonly main: Range

    /** The cards of the pool of a pet, or how many a booster holds in all. */
    readonly pool: number

    /** The cards of the chain that stands for a unit, as a fusion holds them. */
    readonly identity: Range
}
