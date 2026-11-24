import type { Card } from "../card/Card"

import type { Window } from "./OrderedChains"
import type { Profile } from "./Profile"
import type { Range } from "./Sizes"

/** What the analysis did when its first way of finding a chain gave none, or none was needed. */
export type Fallback =
    "donnée par la source"|"plage élargie"|"première carte jouable seule"|"plus courte chaîne lisible"
    |"cherchée aussi parmi les cartes de la course"

/** A card considered when picking cards of a set one after the other: what came of it. */
export interface PickStep {
    readonly card: Card

    /** How well it fits the profile. */
    readonly fit: number

    /** The cards it needs to read whole, with itself first, none when they lack. */
    readonly row: readonly Card[]|null
    readonly kept: boolean

    /** Why it was kept or not, in words. */
    readonly reason: string
}

/** How one chain was found: what was searched, how, and what was kept. */
export interface ChainTrace {
    readonly profile: Profile

    /** The length wished for. */
    readonly size: Range

    /** The cards searched: the chain of an ordered source, the set of an unordered one. */
    readonly searched: readonly Card[]

    /** The runs tried, for an ordered source, none for an unordered one. */
    readonly windows: readonly Window[]

    /** The cards considered one after the other, for an unordered source, none for an ordered one. */
    readonly steps: readonly PickStep[]

    /** The chain found, in the order it reads. */
    readonly chosen: readonly Card[]

    /** What was done when the first way found nothing, in order. */
    readonly fallbacks: readonly Fallback[]
}

/** Why a chain was not kept as the one that stands for a unit. */
export type CandidateRejection =
    "moins de 2 cartes"|"que des pas et des visées"|"hors taille"|"ne se mélange pas"|"une autre chaîne compte plus"

/** A chain tried as the one that stands for a unit, and what it is worth. */
export interface Candidate {
    readonly cards: readonly Card[]

    /** What its cards do to the fight, added up. */
    readonly strength: number

    /** How much its cards set the unit apart, added up. */
    readonly distinct: number

    /** How many times the unit plays exactly this chain. */
    readonly occurrences: number
    readonly total: number
    readonly status: "chosen"|"rejected"

    /** Why it was not kept, none for the one that was. */
    readonly reason: CandidateRejection|null
}

/** How the chain that stands for a unit was found: what was tried, what each was worth, what was kept. */
export interface IdentityTrace {
    /** The length wished for. */
    readonly size: Range

    /** The cards the chains were taken from. */
    readonly searched: readonly Card[]
    readonly candidates: readonly Candidate[]

    /** The chain kept, none when the unit has none. */
    readonly chosen: readonly Card[]

    /** What was done to find one, in order. */
    readonly notes: readonly string[]
}

/** The trace of a chain the source tells itself: nothing was searched. */
export function given(
    profile: Profile, size: Range, searched: readonly Card[], chosen: readonly Card[],
): ChainTrace {
    return { profile, size, searched, windows: [], steps: [], chosen, fallbacks: ["donnée par la source"] }
}

/** How the three chains a target asks of a source were found. */
export interface Traces {
    readonly run: ChainTrace
    readonly bite: ChainTrace
    readonly main: ChainTrace
}
