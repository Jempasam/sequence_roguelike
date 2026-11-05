import type { KeywordWord } from "../../../../semantic"
import type { Card } from "../card/Card"
import { DECK } from "../base/keywords"

import type { Hero } from "./Hero"

/** The color of each deck of a character, in turn: in the order of the card backs of the interface. */
const DECK_COLORS: readonly string[] = ["violet", "rouge", "vert", "ocre"]

/**
 * The name of a deck by its color: `Deck rouge`, `Deck` alone among its character's, and `Deck rouge 2` once
 * the colors, taken in turn, come back.
 *
 * @param place - Its place among the decks of its character.
 * @param count - How many decks its character holds.
 */
export function deckName(place: number, count: number): KeywordWord {
    if(count <= 1) return DECK.as("Deck")
    const color = DECK_COLORS[place % DECK_COLORS.length]
    const round = Math.floor(place / DECK_COLORS.length)
    return DECK.as(round > 0 ? `Deck ${color} ${round + 1}` : `Deck ${color}`)
}

/** The name of a deck of a character. */
export function deckNameOf(hero: Hero, deck: readonly Card[]): KeywordWord {
    return deckName(hero.decks.indexOf(deck as Card[]), hero.decks.length)
}
