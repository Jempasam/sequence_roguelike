import type { Card } from "../card/Card"
import type { HeartKind } from "../heart/HeartKind"
import type { StatusType } from "../status/Status"

import { featuresOf } from "./CardFeatures"

/** What a card gives: a state put on someone, or hearts given to the unit. */
export type Effect =
    | { readonly kind: "status", readonly type: StatusType }
    | { readonly kind: "hearts", readonly heart: HeartKind, readonly count: number }

/** An effect and the cards of the chain that give it. */
export interface EffectUse {
    readonly effect: Effect
    readonly cards: readonly Card[]
}

/**
 * Where the effects of a side were found: in the chain that stands for the unit, completed by the rest of its
 * cards, or in all its cards when the chain has none.
 */
export type EffectScope = "chaîne d'identité"|"chaîne d'identité, puis le reste"|"toute la source"

/**
 * The effects the cards give, the negative ones, the positive ones and the neutral ones, the one given by the
 * most cards first.
 */
export interface EffectsTrace {
    /** What is put on others, against them: the states that are negative. */
    readonly negative: readonly EffectUse[]
    readonly negativeScope: EffectScope

    /** What is put on the unit, for it: the states that are positive, and the hearts. */
    readonly positive: readonly EffectUse[]
    readonly positiveScope: EffectScope

    /** The states that are neither, on others or on the unit: what stands in for a side that has none. */
    readonly neutral: readonly EffectUse[]
    readonly neutralScope: EffectScope
}

/** The effects of some cards, each with the cards that give it, in the order they are first met. */
function usesOf(cards: readonly Card[], side: "negative"|"positive"|"neutral"): EffectUse[] {
    const found = new Map<string, { effect: Effect, cards: Card[] }>()
    const note = (key: string, effect: Effect, card: Card): void => {
        const use = found.get(key) ?? { effect, cards: [] }
        if(!use.cards.includes(card)) use.cards.push(card)
        found.set(key, use)
    }
    const ids = new Map<object, number>()
    const idOf = (thing: object): number => {
        if(!ids.has(thing)) ids.set(thing, ids.size)
        return ids.get(thing)!
    }
    for(const card of cards){
        const { effects } = featuresOf(card)
        if(!effects) continue
        const statuses = side === "negative" ? effects.onTarget
            : side === "positive" ? effects.onSelf
                : [...effects.onTarget, ...effects.onSelf]
        for(const type of statuses){
            if(type.polarity === side) note(`s${idOf(type)}`, { kind: "status", type }, card)
        }
        if(side === "positive"){
            for(const { kind, count } of effects.hearts){
                note(`h${idOf(kind)}`, { kind: "hearts", heart: kind, count }, card)
            }
        }
    }
    const rows = [...found.values()].map((row, index) => ({ ...row, index }))
    const rank = (row: { effect: Effect }): number => row.effect.kind === "status" ? 0 : 1
    rows.sort((first, second) => {
        return second.cards.length - first.cards.length
            || rank(first) - rank(second)
            || first.index - second.index
    })
    return rows.map(({ effect, cards: given }) => ({ effect, cards: given }))
}

/** The effects of a side: those of the chain first, then those of the rest of the source it does not give. */
function sideOf(
    own: readonly EffectUse[], all: readonly EffectUse[],
): { uses: readonly EffectUse[], scope: EffectScope } {
    if(own.length === 0) return { uses: all, scope: "toute la source" }
    const same = (use: EffectUse, other: EffectUse): boolean => {
        return sameEffect(use.effect, other.effect)
    }
    const others = all.filter(use => !own.some(known => same(use, known)))
    return { uses: [...own, ...others], scope: others.length > 0 ? "chaîne d'identité, puis le reste" : "chaîne d'identité" }
}

/** Are two effects the same: the same status, or the same kind of heart? */
function sameEffect(first: Effect, second: Effect): boolean {
    if(first.kind === "status" && second.kind === "status") return first.type === second.type
    if(first.kind === "hearts" && second.kind === "hearts") return first.heart === second.heart
    return false
}

/**
 * The effects the cards of a unit give: those of the chain that stands for it first, then those of the rest
 * of its cards, so a side whose first effects the game cannot pour still finds others. A side with nothing in
 * the chain has those of all its cards. The neutral ones are told like the others, to stand in for a side
 * that has none.
 */
export function effectsOf(chain: readonly Card[], source: readonly Card[]): EffectsTrace {
    const negative = sideOf(usesOf(chain, "negative"), usesOf(source, "negative"))
    const positive = sideOf(usesOf(chain, "positive"), usesOf(source, "positive"))
    const neutral = sideOf(usesOf(chain, "neutral"), usesOf(source, "neutral"))
    return {
        negative: negative.uses, negativeScope: negative.scope,
        positive: positive.uses, positiveScope: positive.scope,
        neutral: neutral.uses, neutralScope: neutral.scope,
    }
}
