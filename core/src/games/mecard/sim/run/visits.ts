import type { Rng } from "../base/Rng"
import { readsWhole, signatureOf } from "../card/CardChain"
import type { Card } from "../card/Card"
import { ACTION } from "../card/CardType"
import { FusionCard } from "../card/subs/composite/FusionCard"
import { cut } from "../card/subs/composite/CompositeCard"
import { MergedCard } from "../card/subs/composite/MergedCard"
import { RandomCard } from "../card/subs/composite/RandomCard"

import type { Hero } from "./Hero"

/** How many cards the place of oblivion takes out of a deck at most. */
export const MAX_REMOVED = 3

/** How many fusions the butcher cuts at most. */
export const MAX_CUT = 2

/** How many cards of each deck the strategist swaps at most. */
export const MAX_SWAPPED = 5

/**
 * Take cards out of a deck, a copy for each.
 *
 * @throws {@link Error} When the deck holds fewer copies of a card than given.
 */
export function removeCards(deck: Card[], cards: readonly Card[]): void {
    const left = [...deck]
    for(const card of cards){
        const index = left.lastIndexOf(card)
        if(index < 0) throw new Error(`The deck holds no more ${card.name}.`)
        left.splice(index, 1)
    }
    deck.splice(0, deck.length, ...left)
}

/**
 * Sacrifice two cards of a deck at the altar, for a copy of a third: the copied card is one the deck holds
 * besides the two sacrificed.
 *
 * @throws {@link Error} When the deck does not hold the three cards.
 */
export function sacrifice(deck: Card[], sacrificed: readonly [Card, Card], copied: Card): void {
    removeCards(deck, sacrificed)
    if(!deck.includes(copied)){
        deck.push(...sacrificed)
        throw new Error(`${copied.name} is not in the deck besides the two sacrificed.`)
    }
    deck.push(copied)
}

/**
 * Fuse cards of a deck into one at the forge, in the order given.
 *
 * @returns The fusion, now in the deck in place of its cards.
 */
export function forge(deck: Card[], cards: readonly Card[]): Card {
    const fusion = new FusionCard(cards)
    removeCards(deck, cards)
    deck.push(fusion)
    return fusion
}

/** How the weaver ties two cards: played at once, or one of them drawn. */
export type WeaveMode = "merged"|"random"

/**
 * Can two cards be tied by the weaver: at once, two cards giving actions and taking nothing; drawn, two
 * cards taking and giving the same.
 */
export function canWeave(cards: readonly Card[], mode: WeaveMode): boolean {
    if(cards.length !== 2) return false
    const [first, second] = cards
    if(mode === "merged") return cards.every(card => card.output === ACTION && card.input === null)
    const one = signatureOf(first)
    const other = signatureOf(second)
    return one.output === other.output && one.input === other.input
}

/** Can a card be one of two the weaver ties, some other card of a deck going with it? */
export function weavable(card: Card, deck: readonly Card[], mode: WeaveMode): boolean {
    const others = [...deck]
    others.splice(others.indexOf(card), 1)
    return others.some(other => canWeave([card, other], mode))
}

/**
 * The card the weaver ties two cards into: played at once, or one of them drawn at the end of each
 * preparation.
 *
 * @throws {@link Error} When the cards cannot be tied so.
 */
export function woven(cards: readonly Card[], mode: WeaveMode): Card {
    if(!canWeave(cards, mode)) throw new Error(`${cards.join(", ")} cannot be woven as ${mode}.`)
    const [first, second] = cards
    return mode === "merged" ? new MergedCard(first, second) : new RandomCard(first, second)
}

/**
 * Tie two cards of a deck into one at the weaver.
 *
 * @returns The card made, now in the deck in place of the two.
 * @throws {@link Error} When the cards cannot be tied so.
 */
export function weave(deck: Card[], cards: readonly Card[], mode: WeaveMode): Card {
    const made = woven(cards, mode)
    removeCards(deck, cards)
    deck.push(made)
    return made
}

/**
 * Cut fusions of a deck back into their cards, one level down, at the butcher.
 *
 * @throws {@link Error} When a card is not a fusion, or not in the deck.
 */
export function cutFusions(deck: Card[], fusions: readonly Card[]): void {
    const cards = fusions.flatMap(cut)
    removeCards(deck, fusions)
    deck.push(...cards)
}

/**
 * Make two copies of a card of a deck one better card, at the alchemist: the copies leave, the upgraded
 * card comes in.
 *
 * @returns The upgraded card, now in the deck in place of the copies.
 */
export function transmute(deck: Card[], card: Card, upgraded: Card): Card {
    removeCards(deck, [card, card])
    deck.push(upgraded)
    return upgraded
}

/**
 * Fuse a whole deck by pairs, as the demon does: each card with the first of the others it reads whole
 * with, the card taking the other first. A card that reads whole with none stays alone.
 *
 * @returns The deck as it now is.
 */
export function possess(deck: Card[]): readonly Card[] {
    const left = [...deck]
    const made: Card[] = []
    for(let card = left.shift(); card; card = left.shift()){
        const partner = pairing(card, left)
        if(!partner){
            made.push(card)
            continue
        }
        left.splice(left.indexOf(partner.other), 1)
        made.push(new FusionCard(partner.order))
    }
    deck.splice(0, deck.length, ...made)
    return deck
}

/**
 * Cut a deck in two at random, as the strategist does: half of its cards, as many as can be, go to a new deck
 * of the character, right after it.
 *
 * @returns The new deck.
 */
export function splitDeck(hero: Hero, deck: Card[], rng: Rng): Card[] {
    const shuffled = [...deck]
    rng.shuffle(shuffled)
    const half = Math.ceil(shuffled.length / 2)
    deck.splice(0, deck.length, ...shuffled.slice(0, half))
    const made = shuffled.slice(half)
    hero.decks.splice(hero.decks.indexOf(deck) + 1, 0, made)
    return made
}

/** Join a deck of a character to another, as the strategist does: its cards go there, and it is no more. */
export function joinDecks(hero: Hero, kept: Card[], joined: Card[]): void {
    kept.push(...joined)
    hero.decks.splice(hero.decks.indexOf(joined), 1)
}

/**
 * Swap cards between two decks, as the strategist does: as many as picked on each side, a copy for each.
 *
 * @throws {@link Error} When a deck does not hold the cards picked from it.
 */
export function swapCards(
    first: Card[], fromFirst: readonly Card[], second: Card[], fromSecond: readonly Card[],
): void {
    removeCards(first, fromFirst)
    removeCards(second, fromSecond)
    first.push(...fromSecond)
    second.push(...fromFirst)
}

/** The first of cards a card reads whole with, and the order the two read in, none when none. */
function pairing(card: Card, others: readonly Card[]): { readonly other: Card, readonly order: Card[] }|null {
    for(const other of others){
        if(readsWhole([card, other])) return { other, order: [card, other] }
        if(readsWhole([other, card])) return { other, order: [other, card] }
    }
    return null
}
