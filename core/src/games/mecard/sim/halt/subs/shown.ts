import { concat, joinText } from "../../../../../semantic"
import type { Text } from "../../../../../semantic"
import type { Card } from "../../card/Card"
import { CardChain, signatureOf } from "../../card/CardChain"
import { isFusion } from "../../card/subs/composite/FusionCard"
import { deckNameOf } from "../../run/deckName"
import { allCards } from "../../run/Hero"
import type { Hero } from "../../run/Hero"
import type { Usable } from "../../usable/Usable"
import type { Shown } from "../HaltContext"
import { CARTE } from "../../base/keywords"

/** What a character comes with: how many cards, its items and what it carries, told even when none. */
export function stuffOf(unit: Hero): Text {
    const listed = (things: readonly Text[]): Text => things.length > 0 ? joinText(things, ", ") : "aucun"
    return concat(
        allCards(unit).length, " ", CARTE.as("cartes"), " · Objets : ", listed(unit.items), " · Utilisables : ", listed(unit.usables), ".",
    )
}

/** A deck of a character on one line: its name, and how many cards it holds. */
export function deckLine(hero: Hero, deck: readonly Card[]): Text {
    return [deckNameOf(hero, deck), " : ", deck.length, " ", CARTE.as("cartes")]
}

/** A deck of a character, as a dialog offers it: told in words, so a tall deck leaves room for the others. */
export function deckShown(hero: Hero, deck: readonly Card[]): Shown {
    const size = deckLine(hero, deck)
    return { cards: [], text: deck.length > 0 ? concat(size, " · ", joinText(deck, ", ")) : size }
}

/** Decks of the party, whole, as a dialog shows them. */
export function decksShown(...decks: readonly (readonly Card[])[]): Shown {
    return { cards: [], decks }
}

/** What a card does, on one line. */
export function cardText(card: Card): Text {
    return concat(card, " : ", card.description)
}

/**
 * What a card is, as a dialog shows it.
 *
 * @param from - The deck it comes from or goes to, none for none.
 */
export function cardShown(card: Card, from?: readonly Card[]): Shown {
    return { cards: [card], from, text: cardText(card) }
}

/**
 * A fusion, and what its cards read: `Répéter ×2(Estoc)`, then what it takes on its right when its last
 * card takes something, else the cards greyed out.
 *
 * @param from - The deck it comes from or goes to, none for none.
 */
export function fusionShown(fusion: Card, from?: readonly Card[]): Shown {
    const chain = new CardChain(isFusion(fusion) ? fusion.contents : [fusion])
    const activity = chain.activity()
    const greyed = chain.cards.filter((_, index) => !activity[index])
    const { input } = signatureOf(fusion)
    const after = input ? concat(" Prend : ", input.name, ", à sa droite.")
        : greyed.length > 0 ? concat(" Grisées : ", joinText(greyed, ", "), ".") : ""
    const roots = chain.roots
    const plays = roots.length > 0 ? joinText(roots, " > ") : "rien"
    return { cards: [fusion], from, text: concat("Se lit : ", plays, ".", after) }
}

/** How many times a usable serves, and whether it comes back. */
function usesOf(usable: Usable): string {
    const charges = usable.charges ?? 1
    const uses = charges > 1 ? `${charges} charges` : "1 utilisation"
    return usable.refill === "battle" ? `${uses}, rechargé à chaque combat` : uses
}

/** A usable offered: its name, what it does, and how many times it serves. */
export function usableText(usable: Usable): Text {
    return concat(usable, " (", usesOf(usable), ") : ", usable.description)
}

/** A name and what it does, on one line. */
export function described(thing: { readonly description: Text }, name: Text): Text {
    return concat(name, " : ", thing.description)
}
