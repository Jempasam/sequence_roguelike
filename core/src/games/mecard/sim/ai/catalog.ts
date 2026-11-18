import type { Rng } from "../base/Rng"

import { DeckAi } from "./Bot"
import { LookaheadAi } from "./LookaheadAi"
import type { Variant } from "./LookaheadAi"
import { RandomAi } from "./RandomAi"
import { ShuffleAi } from "./ShuffleAi"
import type { LookaheadOptions } from "./ShuffleAi"
import type { Combination } from "./lookaheadHelpers"
import type { UnitController } from "./UnitController"

/** How many chains `smart1` to `smart8` try each round, by default. */
export const DEFAULT_CANDIDATES = 6

/** What sets each lookahead AI apart from the one before: `smart2` to `smart8`. */
export const SMART_VARIANTS = {
    smart2: { heuristics: false, prune: false, local: false, durations: false },
    smart3: { heuristics: true, prune: false, local: false, durations: false },
    smart4: { heuristics: true, prune: true, local: false, durations: false },
    smart5: { heuristics: true, prune: true, local: false, durations: true },
    smart6: { heuristics: true, prune: false, local: true, durations: true },
    smart7: { heuristics: true, prune: false, local: true, durations: true, threshold: 2, ahead: true },
    smart8: { heuristics: true, prune: false, local: true, durations: true, threshold: 2, ahead: true, valid: true },
} as const satisfies Readonly<Record<string, Variant>>

/** The latest `smartN`, which `smart` stands for: set to the last version at each new one. */
export const LATEST_SMART = "smart8"

/** How a `smart9` or `smart10` AI sets up its `smart8`. */
export interface DepthAi {
    /** The depths whose scores are averaged; its own depth is the deepest of them, whatever depth it is built with. */
    readonly depths: readonly number[]

    /** Does it try its chains without the decks, see {@link LookaheadOptions.hiddenDecks}? */
    readonly hiddenDecks: boolean

    /** What it changes of the variant of `smart8`, nothing when not told. */
    readonly variant?: Partial<Variant>

    /** How it makes one score of its levels, see {@link LookaheadOptions.combine}: the mean when not told. */
    readonly combine?: Combination

    /** The AI that plays the second round of its battles tried, with depth 0, see {@link LookaheadOptions.future}. */
    readonly future?: AiName
}

/** The `smart9` and `smart10` AIs: `smart8` with the depths, the decks and the rest set by their name. */
export const DEPTH_AIS = {
    smart9_2: { depths: [2], hiddenDecks: false },
    smart9_1_2: { depths: [1, 2], hiddenDecks: false },
    smart9_1_2_3: { depths: [1, 2, 3], hiddenDecks: false },
    smart10: { depths: [1, 2, 3], hiddenDecks: false },
    smart10_blind: { depths: [1, 2, 3], hiddenDecks: true },
    smart10_position: { depths: [1, 2, 3], hiddenDecks: false, variant: { positions: { exposed: -0.5, aim: 0.5 } } },
    smart10_future: { depths: [1, 2, 3], hiddenDecks: false, variant: { aheadChains: 6 } },
    smart10_smartfuture: { depths: [1, 2, 3], hiddenDecks: false, future: "smart3" },
    smart10_safe: { depths: [1, 2, 3], hiddenDecks: false, combine: "safe" },
    smart10_unsafe: { depths: [1, 2, 3], hiddenDecks: false, combine: "unsafe" },
} as const satisfies Readonly<Record<string, DepthAi>>

/** The names of the AIs, in the order they are listed: `deck`, `random`, `smart1` to the `smart10`, then `smart`. */
export const AI_NAMES = [
    "deck", "random", "smart1", "smart2", "smart3", "smart4", "smart5", "smart6", "smart7", "smart8",
    "smart9_2", "smart9_1_2", "smart9_1_2_3", "smart10", "smart10_blind", "smart10_position", "smart10_future",
    "smart10_smartfuture", "smart10_safe", "smart10_unsafe", "smart",
] as const

/**
 * A `smart9` or `smart10`: `smart8` changed by its setup, at the deepest of its depths, its AI of the future
 * made with the same random numbers, candidates and usables, at depth 0.
 */
export function depthAi(
    setup: DepthAi, rng: Rng, candidates: number, usables: boolean, options: LookaheadOptions = {},
): LookaheadAi {
    const variant: Variant = { ...SMART_VARIANTS.smart8, ...setup.variant }
    return new LookaheadAi(rng, candidates, usables, variant, Math.max(...setup.depths), {
        ...options,
        depths: setup.depths,
        hiddenDecks: setup.hiddenDecks,
        combine: setup.combine,
        future: setup.future ? aiNamed(setup.future, rng, 0, candidates, usables) : undefined,
    })
}

/** What makes an AI from the random numbers it draws from: one AI for each unit, none shared. */
export type AiMaker = (rng: Rng) => UnitController

/** The depth of the levels of the AIs of the other units that {@link BEST_AI} calls. */
const BEST_AI_DEPTH = 1

/**
 * The best AI there is, to play the fighters that must not be an easy win: the latest `smartN`, set to the
 * last version at each new one.
 *
 * @remarks
 * A maker, not an AI: an AI keeps the random numbers it draws from, and they must be those of the fight it plays.
 */
export const BEST_AI: AiMaker = rng => new LookaheadAi(
    rng, DEFAULT_CANDIDATES, true, SMART_VARIANTS[LATEST_SMART], BEST_AI_DEPTH,
)

/** The name of an AI of the catalog. */
export type AiName = typeof AI_NAMES[number]

/**
 * An AI of the catalog by its name.
 *
 * @param rng - What the AI draws its random numbers from, when it draws any.
 * @param depth - The base depth of a `smartN`: how many levels of the AIs of the other units it calls. A
 * `smart9` or `smart10` takes the deepest of its {@link DEPTH_AIS} depths instead.
 * @param candidates - How many chains a `smartN` tries, {@link DEFAULT_CANDIDATES} when not told.
 * @param usables - Does a `smartN` use the usables of its unit?
 * @param options - The players, leaf and depths of a `smartN`.
 */
export function aiNamed(
    name: AiName, rng: Rng, depth: number, candidates: number = DEFAULT_CANDIDATES, usables = true,
    options: LookaheadOptions = {},
): UnitController {
    if(name === "deck") return new DeckAi()
    if(name === "random") return new RandomAi(rng)
    if(name === "smart1") return new ShuffleAi(rng, candidates, depth, options)
    if(name in DEPTH_AIS) return depthAi(DEPTH_AIS[name as keyof typeof DEPTH_AIS], rng, candidates, usables, options)
    const kind = (name === "smart" ? LATEST_SMART : name) as keyof typeof SMART_VARIANTS
    return new LookaheadAi(rng, candidates, usables, SMART_VARIANTS[kind], depth, options)
}
