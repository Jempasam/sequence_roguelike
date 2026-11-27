import { DISTANCE, HEAL, UNIT, BATTLE_ROUND } from "../../../base/keywords"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { HeartCount } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { BLUE_HEART } from "../../../heart/subs/BlueHeartKind"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"
import { Fever } from "../../../process/subs/Fever"
import { Strength } from "../../../process/subs/Strength"
import { POISONED } from "../../../status/subs/Poison"
import { BLEEDING } from "../../../status/subs/Wounds"

import { Rarity } from "../../Rarity"
import { ActionCard } from "../ActionCard"
import { onFirstAhead, onSelf } from "../tools/targeting"

/** How many rounds of bleeding, and hearts of blue, the scarification gives. */
const SCARIFICATION_LEVEL = 2

/** How many rounds of poison, and how much strength, the inoculation gives. */
const INOCULATION_POISON = 1
const INOCULATION_STRENGTH = 2

/** How far ahead the aggravation reaches, and how wide, in meters. */
const AGGRAVATION_LENGTH = 1.5 - UNIT_RADIUS
const AGGRAVATION_WIDTH = 0.4

/** The bad statuses a unit holds, each with its level. */
function negatives(unit: Unit) {
    return [...unit.statuses].filter(([type]) => type.polarity === "negative")
}

export const SCARIFICATION = new ActionCard("Scarification", [
    "Prend ", SCARIFICATION_LEVEL, " ", BATTLE_ROUND.as("rounds"), " de saignement et gagne ", new HeartCount(SCARIFICATION_LEVEL), " ", BLUE_HEART, ".",
], Rarity.COMMON, onSelf((battle, unit) => {
    battle.applyStatus(unit, BLEEDING, SCARIFICATION_LEVEL)
    for(let each = 0; each < SCARIFICATION_LEVEL; each++) unit.hearts.give(new Heart(BLUE_HEART))
}, "scarification"))

export const INOCULATION = new ActionCard("Inoculation", [
    "Prend ", INOCULATION_POISON, " ", BATTLE_ROUND, " de poison et gagne +", INOCULATION_STRENGTH, " force jusqu'à la fin du ", BATTLE_ROUND, ".",
], Rarity.COMMON, onSelf((battle, unit) => {
    battle.applyStatus(unit, POISONED, INOCULATION_POISON)
    battle.startProcess(unit, new Strength(INOCULATION_STRENGTH))
}, "inoculation"))

export const AGGRAVATION = new ActionCard("Aggravation", [
    "Double le niveau de chaque statut négatif de la première ", UNIT, " touchée sur ", AGGRAVATION_LENGTH,
    " ", DISTANCE, ".",
], Rarity.RARE, onFirstAhead(AGGRAVATION_LENGTH, AGGRAVATION_WIDTH, (battle, _unit, target) => {
    for(const [type, status] of negatives(target)) battle.applyStatus(target, type, status.level)
}, "aggravation"))

export const PLAGUE_MASK = new ActionCard("Masque à bec", [
    "Gagne ", new HeartCount(1), " ", SHIELD_HEART, " par niveau de statut négatif que tu portes, au moins un.",
], Rarity.RARE, onSelf((_battle, unit) => {
    const shields = Math.max(1, negatives(unit).reduce((X,x)=>X + x[1].level, 0))
    for(let each = 0; each < shields; each++) unit.hearts.give(new Heart(SHIELD_HEART))
}, "masque à bec"))

export const PURGE = new ActionCard("Purge", [
    "Retire tes statuts négatifs et soigne ", new HeartCount(1), " + ", HEAL, " par statut retiré.",
], Rarity.RARE, onSelf((battle, unit) => {
    const bad = negatives(unit)
    for(const [type] of bad) battle.removeStatus(unit, type)
    if(bad.length > 0) unit.hearts.heal(bad.length * (1 + unit.stats.heal.value))
}, "purge"))

export const COMBAT_FEVER = new ActionCard("Fièvre de combat", [
    "+1 force et +1 précision par statut négatif que tu portes, jusqu'à la fin du ", BATTLE_ROUND, ".",
], Rarity.EPIC, onSelf((battle, unit) => {
    const count = negatives(unit).length
    if(count > 0) battle.startProcess(unit, new Fever(count))
}, "fièvre"))
