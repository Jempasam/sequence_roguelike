import { HeartCount } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"

import { PrepCard } from "../PrepCard"
import { Rarity } from "../../Rarity"

/** How many shield hearts the prayer gives, before the healing of the unit. */
const PRAYER_HEARTS = 2

/** Shield hearts, given before anything is played, the healing of the unit on top of them. */
export const PRAYER = new PrepCard("Prière", [
    "Fin de préparation : gagne ", new HeartCount(PRAYER_HEARTS), " ", SHIELD_HEART, ", plus un par point de soin.",
], Rarity.RARE, ({ unit }) => {
    const count = PRAYER_HEARTS + unit.stats.heal.value
    for(const heart of Heart.many(SHIELD_HEART, count)) unit.hearts.give(heart)
})
