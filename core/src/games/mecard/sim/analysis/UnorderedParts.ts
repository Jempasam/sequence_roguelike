import { composable } from "../card/Card"
import type { Card } from "../card/Card"
import { readsWhole, signatureOf } from "../card/CardChain"
import { ACTION, CARD } from "../card/CardType"

import { fitOf, profileOf, PROFILES } from "./Profile"
import type { Profile } from "./Profile"

// The tools of this file take an UNORDERED set of cards: a pool, a draw pile. No place counts in it.

/** The cards each once, in the order they are first met. */
function distinct(parts: readonly Card[]): Card[] {
    return [...new Set(parts)]
}

/** The cards of a set, each once, those that fit a profile the most first: the order of the set on a tie. */
export function ranked(
    parts: readonly Card[], profile: Profile, among: readonly Profile[] = PROFILES,
): Card[] {
    return distinct(parts)
        .map((card, index) => ({ card, index, fit: fitOf(card, profile, among) }))
        .sort((first, second) => second.fit - first.fit || first.index - second.index)
        .map(({ card }) => card)
}

/** The `count` cards of a set that fit a profile the most, each once, only those that fit it at all. */
export function bestSet(
    parts: readonly Card[], profile: Profile, count: number, among: readonly Profile[] = PROFILES,
): Card[] {
    const fitting = ranked(parts, profile, among).filter(card => fitOf(card, profile, among) > 0)
    return fitting.slice(0, Math.max(0, count))
}

/** The cards of a set gathered by the profile each is for the most, in the order of the set. */
export function partition(
    parts: readonly Card[], among: readonly Profile[] = PROFILES,
): Map<Profile, Card[]> {
    const found = new Map<Profile, Card[]>(among.map(profile => [profile, []]))
    for(const card of distinct(parts)) found.get(profileOf(card, among))?.push(card)
    return found
}

/**
 * The cards of a set that can stand where a card stands in a chain without breaking how it reads and with
 * the same use: those that take and give the same types and are for the same profile, the ones that fit it
 * the most first, each once, the card itself left out.
 */
export function interchangeable(
    parts: readonly Card[], card: Card, profile: Profile, among: readonly Profile[] = PROFILES,
): Card[] {
    const { input, output } = signatureOf(card)
    const same = distinct(parts).filter(each => {
        if(each === card || !composable(each) || profileOf(each, among) !== profile) return false
        const signature = signatureOf(each)
        return signature.input === input && signature.output === output
    })
    return ranked(same, profile, among)
}

/** The cards of a set less some, one card of the set for each card taken. */
export function without(parts: readonly Card[], taken: readonly Card[]): Card[] {
    const left = [...parts]
    for(const card of taken){
        const at = left.indexOf(card)
        if(at >= 0) left.splice(at, 1)
    }
    return left
}

/**
 * The cards of a set that make a card read whole with it: the card, then the card that gives it its input,
 * then the one that gives that one its own, and so on. None when the set lacks one of them, or the row does
 * not read whole, a lone module for one.
 */
export function completion(card: Card, parts: readonly Card[]): Card[]|null {
    const row = [card]
    let last = card
    for(;;){
        const { input } = signatureOf(last)
        if(input === null) return readsWhole(row) ? row : null
        const gives = (each: Card): boolean => input === CARD || signatureOf(each).output === input
        const next = parts.find(each => !row.includes(each) && gives(each))
        if(!next) return null
        row.push(next)
        last = next
    }
}

/**
 * An order the cards of a set read whole in: first the cards that take an input, each followed by the cards
 * that give it, then the cards that need none. The cards that would not read are left out. This is the only
 * way from a set to a chain.
 */
export function arranged(parts: readonly Card[]): Card[] {
    const unused = distinct(parts)
    const takers = unused.filter(card => signatureOf(card).input !== null)
    const result: Card[] = []
    for(const card of [...takers, ...unused.filter(each => !takers.includes(each))]){
        if(!unused.includes(card)) continue
        const row = completion(card, unused)
        if(!row) continue
        result.push(...row)
        for(const used of row) unused.splice(unused.indexOf(used), 1)
    }
    return readsWhole(result) ? result : []
}

/**
 * Do the cards of a set let something work by themselves: each card that takes an input has a card of the set
 * to give it, or takes an action, which every adventurer has of its own?
 */
export function comboPossible(parts: readonly Card[]): boolean {
    if(parts.length === 0) return false
    const outputs = new Set(parts.map(card => signatureOf(card).output))
    return parts.every(card => {
        const { input } = signatureOf(card)
        return input === null || input === ACTION || input === CARD || outputs.has(input)
    })
}
