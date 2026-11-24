import type { Card } from "../card/Card"
import { ALL_KITS } from "../catalog/kits"
import { ALL_MONSTERS } from "../catalog/monsters"
import { ALL_PETS } from "../catalog/pets"

/** In how many units of the game the cards of each are found, and how many units there are. */
interface Index {
    readonly units: number
    readonly found: ReadonlyMap<Card, number>
}

let known: Index|null = null

/** The index of the decks of the monsters, the pets and the adventurers, made once. */
function index(): Index {
    if(known) return known
    const decks: (readonly Card[])[] = [
        ...ALL_MONSTERS.map(monster => monster.cards),
        ...ALL_PETS.map(pet => pet.cards),
        ...ALL_KITS.map(kit => kit.cards),
    ]
    const found = new Map<Card, number>()
    for(const deck of decks){
        for(const card of new Set(deck)) found.set(card, (found.get(card) ?? 0) + 1)
    }
    known = { units: decks.length, found }
    return known
}

/**
 * How much a card sets a unit apart: the less units hold it among all the monsters, pets and adventurers
 * of the game, the more it is worth, `ln(units / (1 + holders))`, never below 0. A card no unit holds is
 * worth the most.
 */
export function idf(card: Card): number {
    const { units, found } = index()
    return Math.max(0, Math.log(units / (1 + (found.get(card) ?? 0))))
}
