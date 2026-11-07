/**
 * @packageDocumentation
 * The catalog of the items.
 */

import type { Item } from "../item"
import {
    ALEMBIC, AMULET, BAG, BOOTS, BOTTLE_BAG, DODGE_SCEPTER, DOLL, ELEMENT_BAG, FANG, GRIMOIRE, MED_KIT,
    POTION_BAG, SATCHEL, SCOPE, SLING, SPYGLASS, TACTICS_BOOK, WHETSTONE,
} from "../item/subs"

/** Every item, for the loot. */
export const ITEMS: readonly Item[] = [
    WHETSTONE, BOOTS, FANG, SPYGLASS, BAG, SATCHEL, GRIMOIRE, AMULET, SCOPE, SLING, MED_KIT, DOLL, ALEMBIC,
    BOTTLE_BAG, DODGE_SCEPTER, POTION_BAG, ELEMENT_BAG, TACTICS_BOOK,
]
