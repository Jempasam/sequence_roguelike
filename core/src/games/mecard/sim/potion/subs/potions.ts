import { HeartCount } from "../../battle/words"
import { CONFUSED, CONFUSION_CHANCE } from "../../status/subs/Confusion"
import { FRENZIED } from "../../status/subs/Frenzy"
import { POISONED } from "../../status/subs/Poison"
import { ENRAGED } from "../../status/subs/Rage"
import { SLOWED, SLOWNESS_FACTOR } from "../../status/subs/Slowness"
import { SWALLOW_HEAL, SWALLOWED } from "../../status/subs/Swallow"
import { SWIFT, SWIFTNESS_FACTOR } from "../../status/subs/Swiftness"
import { VIGOR_BONUS, VIGOROUS } from "../../status/subs/Vigor"
import { VULNERABILITY_DAMAGE, VULNERABLE } from "../../status/subs/Vulnerability"
import { WEAKENED, WEAKNESS_MALUS } from "../../status/subs/Weakness"
import { SOUL_LINKED, SOUL_SHIELDED } from "../../status/subs/Wounds"
import type { StatusType } from "../../status/Status"
import type { Potion } from "../Potion"

import { StatusPotion } from "./StatusPotion"
import { UNIT, BATTLE_ROUND, BATTLE_TURN } from "../../base/keywords"
import { TURN } from "../../battle/mecanic/turn/keyword"

export const POISON_POTION = new StatusPotion("poison", [
    "En fin de ", BATTLE_ROUND, ", autant de ", new HeartCount(1), " perdus que de ", BATTLE_ROUND.as("rounds"), " restants.",
], POISONED)

export const SLOWNESS_POTION = new StatusPotion("lenteur", [
    "Agilité × ", SLOWNESS_FACTOR, " : chaque déplacement va moins loin.",
], SLOWED)

export const WEAKNESS_POTION = new StatusPotion("faiblesse", [
    "Force −", WEAKNESS_MALUS, " : chaque coup fait moins mal.",
], WEAKENED)

export const RAGE_POTION = new StatusPotion("rage", [
    "Avant chaque ", BATTLE_TURN.as("étape"), ", ", TURN.as("se tourne"), " vers un ennemi au hasard.",
], ENRAGED)

export const CONFUSION_POTION = new StatusPotion("confusion", [
    "Avant chaque ", BATTLE_TURN.as("étape"), ", ", CONFUSION_CHANCE * 100, " % de chances de ",
    TURN.as("se tourner"), " n'importe où.",
], CONFUSED)

export const VULNERABILITY_POTION = new StatusPotion("vulnérabilité", [
    "Chaque blessure en appelle une autre de ", new HeartCount(VULNERABILITY_DAMAGE), ".",
], VULNERABLE)

export const FRENZY_POTION = new StatusPotion("frénésie", [
    "Avant chaque ", BATTLE_TURN.as("étape"), ", ", TURN.as("se tourne"), " vers l'", UNIT, " la plus proche, alliée ou ennemie.",
], FRENZIED)

export const SOUL_LINK_POTION = new StatusPotion("lien d'âme", [
    "Chaque blessure d'une ", UNIT, " liée est répétée aux autres.",
], SOUL_LINKED)

export const SOUL_SHIELD_POTION = new StatusPotion("bouclier d'âme", [
    "Chaque blessure d'une ", UNIT, " liée est partagée entre toutes.",
], SOUL_SHIELDED)

export const VIGOR_POTION = new StatusPotion("vigueur", [
    "Force +", VIGOR_BONUS, " : chaque coup fait plus mal.",
], VIGOROUS)

export const SWIFTNESS_POTION = new StatusPotion("célérité", [
    "Agilité × ", SWIFTNESS_FACTOR, " : chaque déplacement va plus loin.",
], SWIFT)

export const SWALLOW_POTION = new StatusPotion("hirondelle", [
    "En fin de ", BATTLE_ROUND, ", soigne ", new HeartCount(SWALLOW_HEAL), " ; disparaît dès que l'", UNIT, " subit des dégâts.",
], SWALLOWED)

/** Every potion, as saved by name. */
export const POTIONS: readonly Potion[] = [
    POISON_POTION, SLOWNESS_POTION, WEAKNESS_POTION, RAGE_POTION, CONFUSION_POTION, VULNERABILITY_POTION,
    FRENZY_POTION, SOUL_LINK_POTION, SOUL_SHIELD_POTION, VIGOR_POTION, SWIFTNESS_POTION, SWALLOW_POTION,
]

/** The potions made for the kinds of status that have none in the catalog, each made once. */
const MADE = new Map<StatusType, Potion>()

/**
 * The potion that puts a kind of status on: the one of the catalog when it has one, else one made for it,
 * which is the same each time and is none of the catalog, so what draws a potion of the game never draws it.
 */
export function potionOfStatus(type: StatusType): Potion {
    const known = POTIONS.find(potion => potion instanceof StatusPotion && potion.type === type)
    if(known) return known
    let made = MADE.get(type)
    if(!made){
        made = new StatusPotion(type.name, type.description, type)
        MADE.set(type, made)
    }
    return made
}
