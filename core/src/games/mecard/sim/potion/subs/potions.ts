import { frenchNumber, HeartCount } from "../../battle/words"
import { CONFUSED, CONFUSION_CHANCE } from "../../status/subs/Confusion"
import { FRENZIED } from "../../status/subs/Frenzy"
import { POISONED } from "../../status/subs/Poison"
import { ENRAGED } from "../../status/subs/Rage"
import { SLOWED, SLOWNESS_FACTOR } from "../../status/subs/Slowness"
import { VULNERABILITY_DAMAGE, VULNERABLE } from "../../status/subs/Vulnerability"
import { WEAKENED, WEAKNESS_MALUS } from "../../status/subs/Weakness"
import { SOUL_LINKED, SOUL_SHIELDED } from "../../status/subs/Wounds"
import type { Potion } from "../Potion"

import { StatusPotion } from "./StatusPotion"
import { UNIT } from "../../base/keywords"

export const POISON_POTION = new StatusPotion("poison", [
    "En fin de round, autant de ", new HeartCount(1), " perdus que de rounds restants.",
], POISONED)

export const SLOWNESS_POTION = new StatusPotion("lenteur", [
    "Agilité × ", frenchNumber(SLOWNESS_FACTOR), " : chaque déplacement va moins loin.",
], SLOWED)

export const WEAKNESS_POTION = new StatusPotion("faiblesse", [
    "Force −", frenchNumber(WEAKNESS_MALUS), " : chaque coup fait moins mal.",
], WEAKENED)

export const RAGE_POTION = new StatusPotion("rage", [
    "Avant chaque étape, se tourne vers un ennemi au hasard.",
], ENRAGED)

export const CONFUSION_POTION = new StatusPotion("confusion", [
    "Avant chaque étape, ", frenchNumber(CONFUSION_CHANCE * 100), " % de chances de se tourner n'importe où.",
], CONFUSED)

export const VULNERABILITY_POTION = new StatusPotion("vulnérabilité", [
    "Chaque blessure en appelle une autre de ", new HeartCount(VULNERABILITY_DAMAGE), ".",
], VULNERABLE)

export const FRENZY_POTION = new StatusPotion("frénésie", [
    "Avant chaque étape, se tourne vers l'", UNIT, " la plus proche, alliée ou ennemie.",
], FRENZIED)

export const SOUL_LINK_POTION = new StatusPotion("lien d'âme", [
    "Chaque blessure d'une ", UNIT, " liée est répétée aux autres.",
], SOUL_LINKED)

export const SOUL_SHIELD_POTION = new StatusPotion("bouclier d'âme", [
    "Chaque blessure d'une ", UNIT, " liée est partagée entre toutes.",
], SOUL_SHIELDED)

/** Every potion, as saved by name. */
export const POTIONS: readonly Potion[] = [
    POISON_POTION, SLOWNESS_POTION, WEAKNESS_POTION, RAGE_POTION, CONFUSION_POTION, VULNERABILITY_POTION,
    FRENZY_POTION, SOUL_LINK_POTION, SOUL_SHIELD_POTION,
]
