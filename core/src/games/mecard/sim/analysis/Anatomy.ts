import type { Visual } from "../base/Visual"
import type { Card } from "../card/Card"
import type { BeastHearts, BodyPart } from "../card/CardType"

import type { Sizes } from "./Sizes"
import type { EffectsTrace } from "./effects"
import type { IdentityTrace, Traces } from "./Trace"

/** What every source of a conversion tells of itself, whether its cards are ordered or not. */
export interface CommonAnatomy {
    readonly name: string

    /** How it looks, none for what has no body: a module, a booster. */
    readonly sprite: Visual|null

    /** Its hearts, none for what has none. */
    readonly hearts: readonly BeastHearts[]

    /** The cards it plays as often as it wishes: the two of a kit. */
    readonly unlimited: readonly Card[]
}

/** A source whose cards are in order: a monster, a module, a beast. */
export interface OrderedAnatomy extends CommonAnatomy {
    readonly ordered: true

    /** Its cards in the order they play. */
    readonly chain: readonly Card[]

    /** How many cards a round of it takes, for a monster. */
    readonly roundSize: number|null

    /** Its run, when it tells which cards that is: a beast. */
    readonly run: readonly Card[]|null

    /** Its bite, when it tells. */
    readonly bite: readonly Card[]|null

    /** The chain of its body with the places of its run and its bite, when it has one: a beast. */
    readonly body: readonly BodyPart[]|null
}

/** A source whose cards are not in order: a pet, a kit, a booster. */
export interface UnorderedAnatomy extends CommonAnatomy {
    readonly ordered: false

    /** Its cards, none before another. */
    readonly parts: readonly Card[]
}

/** What a source of a conversion is, in the form every kind of source is put in. */
export type Anatomy = OrderedAnatomy | UnorderedAnatomy

/** An ordered anatomy of a chain and what it is called, the rest empty. */
export function orderedAnatomy(
    name: string, chain: readonly Card[], more: Partial<Omit<OrderedAnatomy, "ordered"|"name"|"chain">> = {},
): OrderedAnatomy {
    return {
        ordered: true, name, chain, sprite: null, hearts: [], unlimited: [],
        roundSize: null, run: null, bite: null, body: null, ...more,
    }
}

/** An unordered anatomy of some cards and what it is called, the rest empty. */
export function unorderedAnatomy(
    name: string, parts: readonly Card[],
    more: Partial<Omit<UnorderedAnatomy, "ordered"|"name"|"parts">> = {},
): UnorderedAnatomy {
    return { ordered: false, name, parts, sprite: null, hearts: [], unlimited: [], ...more }
}

/**
 * What a target asks of a source, as chains read from its cards: each is told by the cards of the source,
 * with the lengths the sizes allow. Every chain it gives is ordered and reads whole.
 */
export interface Analysis {
    readonly anatomy: Anatomy

    /** The cards that carry it from where it stands to the fight. */
    run(sizes: Sizes): Card[]

    /** The cards that strike, none of those of the run. */
    bite(sizes: Sizes): Card[]

    /** The chain that leads the fight, as a module holds it. */
    main(sizes: Sizes): Card[]

    /** The cards that are for neither: aims, guards, calls and what changes other cards. */
    support(sizes: Sizes): Card[]

    /** The cards of the source less the cards given, one for each. */
    rest(...taken: readonly (readonly Card[])[]): Card[]

    /** The chain of a body, the places of its run and its bite named: both are always there. */
    roles(sizes: Sizes): BodyPart[]

    /** How the run, the bite and the main chain were found: what `run`, `bite` and `main` give, and how. */
    traces(sizes: Sizes): Traces

    /** The chain that stands for the unit, and how it was found among the chains the unit plays. */
    identity(sizes: Sizes): IdentityTrace

    /** The most telling chain of at least two cards that merges into one card, and how it was found. */
    melange(sizes: Sizes): IdentityTrace

    /** What the cards give: the states put on others and on the unit, and the hearts, by polarity. */
    effects(sizes: Sizes): EffectsTrace
}
