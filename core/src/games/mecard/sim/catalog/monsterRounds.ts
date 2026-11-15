import type { Card } from "../card/Card"

import type { Monster } from "./monsters"

/** The first round of the deck of a monster: how it comes at its enemies, as the catalog writes it. */
export function firstRound(monster: Monster): readonly Card[] {
    return monster.cards.slice(0, monster.draw)
}

/** The last round of the deck of a monster: how it strikes, as the catalog writes it. */
export function lastRound(monster: Monster): readonly Card[] {
    return monster.cards.slice(-monster.draw)
}
