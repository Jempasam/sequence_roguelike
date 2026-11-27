import { concat } from "../../../../semantic"
import type { Text } from "../../../../semantic"
import { HEART } from "../base/keywords"
import type { HeartKind } from "../heart/HeartKind"
import { BLACK_HEART } from "../heart/subs/BlackHeartKind"
import { BLUE_HEART } from "../heart/subs/BlueHeartKind"
import { EXPLOSIVE_HEART } from "../heart/subs/ExplosiveHeartKind"
import { GLASS_HEART } from "../heart/subs/GlassHeartKind"
import { PINK_HEART } from "../heart/subs/PinkHeartKind"
import { QUICK_HEART } from "../heart/subs/QuickHeartKind"
import { RED_HEART } from "../heart/subs/RedHeartKind"
import { SHIELD_HEART } from "../heart/subs/ShieldHeartKind"
import { THORN_HEART } from "../heart/subs/ThornHeartKind"
import { VITAL_HEART } from "../heart/subs/VitalHeartKind"

/** Hearts found as loot: a kind, and how many of it, which balances the kind. */
export interface HeartLoot {
    readonly heart: HeartKind
    readonly count: number
}

/** What hearts found as loot are, for the player: their kind, how many, and what they do. */
export function heartLootText({ heart, count }: HeartLoot): Text {
    return concat(HEART, " ", heart, " ×", String(count), " : ", heart.description)
}

/** The hearts won at the end of a fight: those that come back, so they last the whole run. */
export const KEPT_LOOT_HEARTS: readonly HeartLoot[] = [
    { heart: RED_HEART, count: 2 }, { heart: PINK_HEART, count: 1 }, { heart: BLACK_HEART, count: 3 },
]

/** The hearts given at the hospital: those used once, gone for good once lost. */
export const SPENT_LOOT_HEARTS: readonly HeartLoot[] = [
    { heart: SHIELD_HEART, count: 2 }, { heart: THORN_HEART, count: 1 }, { heart: GLASS_HEART, count: 4 },
    { heart: EXPLOSIVE_HEART, count: 1 }, { heart: VITAL_HEART, count: 1 }, { heart: QUICK_HEART, count: 1 },
    { heart: BLUE_HEART, count: 3 },
]
