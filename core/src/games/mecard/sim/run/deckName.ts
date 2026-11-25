import type { KeywordWord } from "../../../../semantic"
import type { Card } from "../card/Card"
import { DECK } from "../base/keywords"
import { rgba } from "../base/Rgba"
import type { Rgba } from "../base/Rgba"

import type { Hero } from "./Hero"

/** A color a deck is known by: its name, and the color itself. */
interface DeckColor {
    readonly name: string
    readonly color: Rgba
}

/** The color of each deck of a character, in turn: in the order of the card backs of the interface. */
const DECK_COLORS: readonly DeckColor[] = [
    { name: "jaune", color: rgba(0.96, 0.82, 0.4) },
    { name: "bleu", color: rgba(0.4, 0.62, 0.95) },
    { name: "rouge", color: rgba(0.92, 0.42, 0.38) },
    { name: "vert", color: rgba(0.45, 0.8, 0.5) },
    { name: "violet", color: rgba(0.72, 0.5, 0.92) },
    { name: "orange", color: rgba(0.95, 0.62, 0.3) },
    { name: "rose", color: rgba(0.95, 0.55, 0.72) },
    { name: "turquoise", color: rgba(0.4, 0.82, 0.8) },
    { name: "marron", color: rgba(0.7, 0.5, 0.35) },
    { name: "gris", color: rgba(0.65, 0.67, 0.72) },
]

/** The color of a deck, by its place among the decks of its character: the colors come back in turn. */
export function deckColorOf(place: number): Rgba {
    return DECK_COLORS[place % DECK_COLORS.length].color
}

/**
 * The name of a deck by its color: `Deck rouge`, `Deck` alone among its character's, and `Deck rouge 2` once
 * the colors, taken in turn, come back.
 *
 * @param place - Its place among the decks of its character.
 * @param count - How many decks its character holds.
 */
export function deckName(place: number, count: number): KeywordWord {
    if(count <= 1) return DECK.as("Deck")
    const color = DECK_COLORS[place % DECK_COLORS.length].name
    const round = Math.floor(place / DECK_COLORS.length)
    return DECK.as(round > 0 ? `Deck ${color} ${round + 1}` : `Deck ${color}`)
}

/** The name of a deck of a character. */
export function deckNameOf(hero: Hero, deck: readonly Card[]): KeywordWord {
    return deckName(hero.decks.indexOf(deck as Card[]), hero.decks.length)
}
