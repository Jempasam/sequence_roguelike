import type { Card } from "../card/Card"
import { readsWhole } from "../card/CardChain"

import { fitOf, profileOf, PROFILES } from "./Profile"
import type { Profile } from "./Profile"
import type { Range } from "./Sizes"

// The tools of this file take an ORDERED chain: the place of a card in it matters, and the results keep it.

/** How close two sums of fits are to count as equal. */
const EPSILON = 1e-9

/** Cards next to each other that are for the same profile. */
export interface Segment {
    readonly profile: Profile
    readonly cards: readonly Card[]
}

/** A place in a chain a name stands for, as the cards it replaces. */
export interface Span<M> {
    readonly marker: M
    readonly at: number
    readonly length: number
}

/** Each card told by the profile it is for the most among `among`, the neighbors of a profile gathered. */
export function segments(chain: readonly Card[], among: readonly Profile[] = PROFILES): Segment[] {
    const found: { profile: Profile, cards: Card[] }[] = []
    for(const card of chain){
        const profile = profileOf(card, among)
        const last = found[found.length - 1]
        if(last && last.profile === profile) last.cards.push(card)
        else found.push({ profile, cards: [card] })
    }
    return found
}

/** Where a run of cards starts in a chain, from `from` on: -1 when the chain holds it nowhere. */
export function locate(chain: readonly Card[], run: readonly Card[], from = 0): number {
    if(run.length === 0) return -1
    for(let at = from; at + run.length <= chain.length; at++){
        if(run.every((card, index) => chain[at + index] === card)) return at
    }
    return -1
}

/** Why a run of cards was not kept. */
export type WindowRejection =
    "début ne colle pas"|"fin ne colle pas"|"hors taille"|"ne se lit pas en entier"|"une autre fenêtre colle mieux"

/** A run of cards tried for a profile: where it stands, how well it fits, and whether it was kept. */
export interface Window {
    readonly at: number
    readonly length: number

    /** The sum of how well each of its cards fits the profile. */
    readonly total: number
    readonly status: "chosen"|"rejected"

    /** Why it was not kept, none for the one that was. */
    readonly reason: WindowRejection|null
}

/**
 * Every run of cards of a length up to `size.max` tried for a profile, in the order they are tried, each
 * told kept or not and why: the cards next to each other, of a length in `size`, that read whole, the first
 * and the last of them fitting the profile, the sum of how well they fit being the largest. The first of the
 * runs on a tie, the longer. One run is kept at most, none when no run reads whole.
 */
export function windows(
    chain: readonly Card[], profile: Profile, size: Range, among: readonly Profile[] = PROFILES,
): Window[] {
    const fits = chain.map(card => fitOf(card, profile, among))
    const tried: { at: number, length: number, total: number, reason: WindowRejection|null }[] = []
    let best = -1
    for(let at = 0; at < chain.length; at++){
        let total = 0
        for(let length = 1; length <= size.max && at + length <= chain.length; length++){
            const last = fits[at + length - 1]
            total += last
            const reason = rejectionOf(chain.slice(at, at + length), fits[at], last, length, size)
            tried.push({ at, length, total, reason })
            if(reason !== null) continue
            const current = tried[best]
            const better = best < 0 || total > current.total + EPSILON
            const same = best >= 0 && at === current.at && Math.abs(total - current.total) <= EPSILON
            if(better || (same && length > current.length)) best = tried.length - 1
        }
    }
    return tried.map((each, index) => ({
        at: each.at, length: each.length, total: each.total,
        status: index === best ? "chosen" : "rejected",
        reason: index === best ? null : each.reason ?? "une autre fenêtre colle mieux",
    }))
}

/** Why a run cannot be kept, none when nothing forbids it. */
function rejectionOf(
    cards: readonly Card[], first: number, last: number, length: number, size: Range,
): WindowRejection|null {
    if(first <= 0) return "début ne colle pas"
    if(last <= 0) return "fin ne colle pas"
    if(length < size.min) return "hors taille"
    return readsWhole(cards) ? null : "ne se lit pas en entier"
}

/** The cards of the run a list of windows keeps, none when it keeps none. */
export function keptRun(chain: readonly Card[], tried: readonly Window[]): Card[] {
    const kept = tried.find(each => each.status === "chosen")
    return kept ? chain.slice(kept.at, kept.at + kept.length) : []
}

/** Where each run of cards starts in a chain, the runs apart from each other: none if it holds none. */
export function occurrences(chain: readonly Card[], run: readonly Card[]): number[] {
    const found: number[] = []
    for(let at = locate(chain, run); at >= 0; at = locate(chain, run, at + run.length)) found.push(at)
    return found
}

/**
 * The run of cards that is the most for a profile: the cards next to each other, of a length in `size`,
 * that read whole, the sum of how well they fit being the largest. The first of the runs on a tie, the
 * longer. The first and the last card must fit it. Nothing when no run of that length reads whole.
 */
export function bestRun(
    chain: readonly Card[], profile: Profile, size: Range, among: readonly Profile[] = PROFILES,
): Card[] {
    return keptRun(chain, windows(chain, profile, size, among))
}

/** The chain cut in rounds of `size` cards, the last one shorter when the cards do not make whole rounds. */
export function rounds(chain: readonly Card[], size: number): Card[][] {
    if(size < 1) return [[...chain]]
    const found: Card[][] = []
    for(let at = 0; at < chain.length; at += size) found.push(chain.slice(at, at + size))
    return found
}

/** What lies before and after a run in a chain, all of it before when the chain does not hold the run. */
export function around(chain: readonly Card[], run: readonly Card[]): { before: Card[], after: Card[] } {
    const at = locate(chain, run)
    if(at < 0) return { before: [...chain], after: [] }
    return { before: chain.slice(0, at), after: chain.slice(at + run.length) }
}

/** The chain less a run, as it stands: itself when it does not hold the run. */
export function without(chain: readonly Card[], run: readonly Card[]): Card[] {
    const { before, after } = around(chain, run)
    return locate(chain, run) < 0 ? before : [...before, ...after]
}

/** The chain with each span replaced by its marker, the spans in order and apart. */
export function marked<M>(chain: readonly Card[], spans: readonly Span<M>[]): (Card|M)[] {
    const found: (Card|M)[] = []
    let at = 0
    for(const span of [...spans].sort((first, second) => first.at - second.at)){
        found.push(...chain.slice(at, span.at), span.marker)
        at = span.at + span.length
    }
    found.push(...chain.slice(at))
    return found
}

/** The chain less the cards of some lists, one card of the chain for each card taken, the order kept. */
export function remaining(chain: readonly Card[], ...taken: readonly (readonly Card[])[]): Card[] {
    const left = [...chain]
    for(const card of taken.flat()){
        const at = left.indexOf(card)
        if(at >= 0) left.splice(at, 1)
    }
    return left
}
