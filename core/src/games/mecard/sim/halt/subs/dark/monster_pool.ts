import type { Text } from "../../../../../../semantic"
import type { Rng } from "../../../base/Rng"
import { CARTE, DECK } from "../../../base/keywords"
import { LOOT_MONSTERS } from "../../../catalog/monsters"
import type { Monster } from "../../../catalog/monsters"
import { distinct, INVENTED_COUNTS } from "../../../run/offers"
import type { Shown } from "../../HaltContext"

/** The monsters a dark one offers: a few distinct ones, drawn among the common monsters unless told otherwise. */
export function offeredMonsters(rng: Rng, count = INVENTED_COUNTS, pool: readonly Monster[] = LOOT_MONSTERS): Monster[] {
    return distinct(rng, pool, count)
}

/** A monster offered, its cards shown once each, and what it is told by. */
export function monsterShown(monster: Monster, text: Text = [monster, " : ", monster.hearts, " cœurs, ", monster.cards.length, " ", CARTE.as("cartes"), " dans son ", DECK, "."]): Shown {
    return { cards: [...new Set(monster.cards)], sprite: monster.sprite, text }
}
