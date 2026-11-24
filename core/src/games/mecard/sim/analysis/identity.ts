import type { Card } from "../card/Card"
import { readsWhole } from "../card/CardChain"
import { mergeable } from "../card/subs/composite/MergedCard"

import { idf } from "./Distinctiveness"
import { MAIN_PROFILE, scoreOf } from "./Profile"
import { plain } from "./roundChains"
import type { Range } from "./Sizes"
import type { Candidate, CandidateRejection, IdentityTrace } from "./Trace"

/** How much more a chain is worth for each more time the unit plays it. */
export const REPEAT_WEIGHT = 0.5

/** How much more a chain is worth for each card it holds beyond two: a slight liking for the long ones. */
export const LENGTH_WEIGHT = 0.25

/** The fewest cards of a chain that stands for a unit. */
export const MIN_CARDS = 2

/** How close two totals are to count as equal. */
const EPSILON = 1e-9

/** What a chain is worth, in the parts it is made of. */
function valueOf(
    cards: readonly Card[], occurrences: number,
): { strength: number, distinct: number, total: number } {
    const strength = cards.reduce((sum, card) => sum + Math.max(0, scoreOf(card, MAIN_PROFILE)), 0)
    const distinct = cards.reduce((sum, card) => sum + idf(card), 0)
    const mean = (strength + distinct) / Math.max(1, cards.length)
    const repeated = 1 + REPEAT_WEIGHT * (occurrences - 1)
    const long = 1 + LENGTH_WEIGHT * (cards.length - MIN_CARDS)
    return { strength, distinct, total: mean * repeated * long }
}

/** The key that tells two chains of the same cards in the same order. */
function keyOf(cards: readonly Card[], ids: Map<Card, number>): string {
    return cards.map(card => {
        if(!ids.has(card)) ids.set(card, ids.size)
        return ids.get(card)
    }).join(",")
}

/** The runs of cards of a chain, of two cards to `max`, each at each place it starts. */
export function runsOf(chain: readonly Card[], max: number): Card[][] {
    const found: Card[][] = []
    for(let at = 0; at < chain.length; at++){
        for(let length = MIN_CARDS; length <= max && at + length <= chain.length; length++){
            found.push(chain.slice(at, at + length))
        }
    }
    return found
}

/** The runs of the chains that read whole: the chains that stand for a unit that has no rounds. */
export function readableRuns(chain: readonly Card[], size: Range): Card[][] {
    return runsOf(chain, size.max).filter(run => run.length >= size.min && readsWhole(run))
}

/**
 * The runs of the chains that merge into one card: each gives actions, and they take one kind of thing at
 * most.
 */
export function mergeableRuns(chains: readonly (readonly Card[])[], size: Range): Card[][] {
    return chains
        .flatMap(chain => runsOf(chain, size.max))
        .filter(run => run.length >= size.min && mergeable(run))
}

/** What a rule of rejection says of a chain, none when nothing forbids it. */
type Forbidding = (cards: readonly Card[]) => CandidateRejection|null

/**
 * The chain that stands for a unit among chains tried: those that hold two cards at least, not only steps and
 * aims, whose length is wished for; each worth what its cards do and set the unit apart, more for each
 * time the unit plays it. The best total wins, the first on a tie, then the longer.
 *
 * @param tried - The chains, one for each time one is found: the same chain twice is played twice.
 * @param sized - Is the length of a chain bound by `size`? A round of a deck has the length of its draw.
 * @param forbids - A rule that refuses a chain beyond the common ones.
 */
export function identityOf(
    tried: readonly (readonly Card[])[], size: Range, searched: readonly Card[], notes: readonly string[],
    sized: boolean, forbids: Forbidding = () => null,
): IdentityTrace {
    const ids = new Map<Card, number>()
    const groups = new Map<string, { cards: readonly Card[], count: number }>()
    for(const cards of tried){
        const key = keyOf(cards, ids)
        const group = groups.get(key)
        if(group) group.count++
        else groups.set(key, { cards, count: 1 })
    }
    const rows = [...groups.values()].map(({ cards, count }) => {
        const reason = rejectionOf(cards, size, sized, forbids)
        return { cards, count, reason, ...valueOf(cards, count) }
    })
    let best = -1
    rows.forEach((row, index) => {
        if(row.reason !== null) return
        const current = best >= 0 ? rows[best] : null
        const better = !current || row.total > current.total + EPSILON
        const same = current !== null && Math.abs(row.total - current.total) <= EPSILON
        if(better || (same && row.cards.length > current.cards.length)) best = index
    })
    const candidates: Candidate[] = rows.map((row, index) => ({
        cards: row.cards, strength: row.strength, distinct: row.distinct, occurrences: row.count,
        total: row.total,
        status: index === best ? "chosen" : "rejected",
        reason: index === best ? null : row.reason ?? "une autre chaîne compte plus",
    }))
    return { size, searched, candidates, chosen: best >= 0 ? rows[best].cards : [], notes }
}

/** Why a chain cannot stand for a unit, none when nothing forbids it. */
function rejectionOf(
    cards: readonly Card[], size: Range, sized: boolean, forbids: Forbidding,
): CandidateRejection|null {
    if(cards.length < MIN_CARDS) return "moins de 2 cartes"
    if(cards.every(plain)) return "que des pas et des visées"
    if(sized && (cards.length < size.min || cards.length > size.max)) return "hors taille"
    return forbids(cards)
}

/** The rule of a chain that must merge into one card. */
export const MUST_MERGE: Forbidding = cards => mergeable(cards) ? null : "ne se mélange pas"
