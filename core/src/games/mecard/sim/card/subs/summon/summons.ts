import { Vector2 } from "../../../base/Vector2"
import { DISTANCE, HEAL, PORTEE, BATTLE_ROUND } from "../../../base/keywords"
import { INVOCATION } from "../../../battle/mecanic/summon/keyword"
import { frenchNumber, HeartCount, SummonedHearts } from "../../../battle/words"
import type { Pose } from "../../../battle/Action"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { THORN_HEART } from "../../../heart/subs/ThornHeartKind"
import { HEALING, TOTEM_RADIUS } from "../../../status/subs/Healing"
import { Rarity } from "../../Rarity"

import { SummonCard } from "./SummonCard"
import { visual } from "../../../base/Visual"

/** How far ahead the coin of the catalog lands, in meters, before the reach of the unit. */
const COIN_THROW = 2.5 - UNIT_RADIUS

/** How many hearts the coin of the catalog lives by, before the summoning of the unit. */
const COIN_HALVES = 2

/** How far ahead of the edge of the unit the bodies set down by the cards of the catalog stand, in meters. */
const AHEAD = 1 - UNIT_RADIUS

/** How far apart the stones of a wall stand, in meters: two bodies touching, so nothing slips between. */
const STONE_SPACING = 0.7

/** How many hearts each stone of the wall of the catalog lives by, before the summoning of the unit. */
const STONE_HALVES = 1

/** How many thorn hearts the thorn bush of the catalog lives by, before the summoning of the unit. */
const THORNS_HALVES = 1

/** How many hearts the totem of the catalog lives by, before the summoning of the unit. */
const TOTEM_HALVES = 2

/** How many hearts the totem of the catalog heals each ally around, before the healing of the unit. */
const TOTEM_HEAL = 1

/** A point ahead of the edge of a unit at a pose, and to its right. */
function ahead(unit: Unit, pose: Pose, forward: number, side = 0): Vector2 {
    return unit.muzzle(pose).plus(Vector2.relative(pose.direction, forward, side))
}

/** A coin thrown ahead, which stands there: a body that blocks and draws the aim. */
export const COIN = new SummonCard("Pièce", [
    INVOCATION.as("Lance"), " une pièce à ", frenchNumber(COIN_THROW), "×", PORTEE, " ", DISTANCE, " devant : une alliée de ", new SummonedHearts(COIN_HALVES),
    ", qui bloque les coups et attire les visées. Perd ", new HeartCount(1), " à chaque fin de ", BATTLE_ROUND, ".",
], Rarity.COMMON, {
    sprite: visual("units/coin"), name: "Pièce", halves: COIN_HALVES, thrown: true,
    spots: (unit, pose) => [ahead(unit, pose, COIN_THROW * unit.stats.throwRange.value)],
})

/** A wall of three stones ahead, across the way the unit faces. */
export const STONE_WALL = new SummonCard("Mur de pierre", [
    INVOCATION.as("Dresse"), " trois pierres de ",new SummonedHearts(STONE_HALVES), " chacune, à ", AHEAD, " ", DISTANCE,
    " devant, en travers. Chacune perd ", new HeartCount(1), " à chaque fin de ", BATTLE_ROUND, ".",
], Rarity.RARE, {
    sprite: visual("units/stone"), name: "Pierre", halves: STONE_HALVES,
    spots: (unit, pose) => [-STONE_SPACING, 0, STONE_SPACING].map(side => ahead(unit, pose, AHEAD, side)),
})

/** A thorn bush ahead: whoever breaks its thorn heart is wounded. */
export const THORN_SHIELD = new SummonCard("Bouclier de ronces", [
    INVOCATION.as("Fait pousser"), " des ronces à ", AHEAD, " ", DISTANCE, " devant : ", new SummonedHearts(THORNS_HALVES, THORN_HEART), ".",
], Rarity.RARE, {
    sprite: visual("units/thorns"), name: "Ronces", halves: THORNS_HALVES, kind: THORN_HEART,
    spots: (unit, pose) => [ahead(unit, pose, AHEAD)],
})

/** A totem ahead, healing the allies around it at the end of each round. */
export const TOTEM = new SummonCard("Totem", [
    INVOCATION.as("Plante"), " un totem de ", new SummonedHearts(TOTEM_HALVES), " à ", AHEAD, " ", DISTANCE, " devant. En fin de ", BATTLE_ROUND, ", ",
    "il soigne de ", new HeartCount(TOTEM_HEAL), " + ", HEAL, " chaque allié à ", frenchNumber(TOTEM_RADIUS), " ", DISTANCE, ".",
], Rarity.EPIC, {
    sprite: visual("units/totem"), name: "Totem", halves: TOTEM_HALVES,
    spots: (unit, pose) => [ahead(unit, pose, AHEAD)],
    equip: (battle, body, owner) => {
        battle.applyStatus(body, HEALING, TOTEM_HEAL + owner.stats.heal.value)
    },
})
