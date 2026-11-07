import { Vector2 } from "../../../base/Vector2"
import { HeartCount, meters } from "../../../battle/words"
import type { Pose } from "../../../battle/Action"
import { Heart } from "../../../heart/Heart"
import { THORN_HEART } from "../../../heart/subs/ThornHeartKind"
import { HEALING, TOTEM_RADIUS } from "../../../status/subs/Healing"
import { Rarity } from "../../Rarity"

import { SummonCard } from "./SummonCard"

/** How far ahead the coin of the catalog lands, in meters, before the reach of the unit. */
const COIN_THROW = 2.5

/** How many hearts the coin of the catalog lives by, before the summoning of the unit. */
const COIN_HALVES = 2

/** How far ahead the bodies set down by the cards of the catalog stand, in meters. */
const AHEAD = 1

/** How far apart the stones of a wall stand, in meters: two bodies touching, so nothing slips between. */
const STONE_SPACING = 0.7

/** How many hearts each stone of the wall of the catalog lives by, before the summoning of the unit. */
const STONE_HALVES = 1

/** How many hearts the thorn bush of the catalog lives by, before its thorn heart and the summoning. */
const THORNS_HALVES = 1

/** How many thorn hearts the thorn bush of the catalog loses first. */
const THORN_HEARTS = 2

/** How many hearts the totem of the catalog lives by, before the summoning of the unit. */
const TOTEM_HALVES = 2

/** How many hearts the totem of the catalog heals each ally around, before the healing of the unit. */
const TOTEM_HEAL = 1

/** A point ahead of a pose, and to its right. */
function ahead(pose: Pose, forward: number, side = 0): Vector2 {
    return pose.position.plus(Vector2.relative(pose.direction, forward, side))
}

/** A coin thrown ahead, which stands there: a body that blocks and draws the aim. */
export const COIN = new SummonCard("Pièce", [
    "Lance une pièce ", meters(COIN_THROW), " × portée devant : une alliée de ", new HeartCount(COIN_HALVES),
    " + invocation, qui bloque les coups et attire les visées. Perd ", new HeartCount(1), " à chaque fin de round.",
], Rarity.COMMON, {
    sprite: "coin", name: "Pièce", halves: COIN_HALVES, thrown: true,
    spots: (unit, pose) => [ahead(pose, COIN_THROW * unit.stats.throwRange.value)],
})

/** A wall of three stones ahead, across the way the unit faces. */
export const STONE_WALL = new SummonCard("Mur de pierre", [
    "Dresse trois pierres de ", new HeartCount(STONE_HALVES), " + invocation chacune, à ", meters(AHEAD),
    " devant, en travers. Chacune perd ", new HeartCount(1), " à chaque fin de round.",
], Rarity.RARE, {
    sprite: "stone", name: "Pierre", halves: STONE_HALVES,
    spots: (_unit, pose) => [-STONE_SPACING, 0, STONE_SPACING].map(side => ahead(pose, AHEAD, side)),
})

/** A thorn bush ahead: whoever breaks its thorn heart is wounded. */
export const THORN_SHIELD = new SummonCard("Bouclier de ronces", [
    "Fait pousser des ronces à ", meters(AHEAD), " devant : ", new HeartCount(THORNS_HALVES), " + invocation, et un cœur ",
    THORN_HEART, " perdu d'abord.",
], Rarity.RARE, {
    sprite: "thorns", name: "Ronces", halves: THORNS_HALVES,
    spots: (_unit, pose) => [ahead(pose, AHEAD)],
    equip: (_battle, body) => {
        for(const heart of Heart.many(THORN_HEART, THORN_HEARTS)) body.hearts.give(heart)
    },
})

/** A totem ahead, healing the allies around it at the end of each round. */
export const TOTEM = new SummonCard("Totem", [
    "Plante un totem de ", new HeartCount(TOTEM_HALVES), " + invocation à ", meters(AHEAD), " devant. En fin de round, ",
    "il soigne de ", new HeartCount(TOTEM_HEAL), " + soin chaque allié à ", meters(TOTEM_RADIUS), ".",
], Rarity.EPIC, {
    sprite: "totem", name: "Totem", halves: TOTEM_HALVES,
    spots: (_unit, pose) => [ahead(pose, AHEAD)],
    equip: (battle, body, owner) => {
        battle.applyStatus(body, HEALING, TOTEM_HEAL + owner.stats.heal.value)
    },
})
