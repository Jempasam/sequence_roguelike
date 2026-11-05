import { frenchNumber, HeartCount } from "../../battle/words"
import { Confusion, CONFUSED, CONFUSION_CHANCE } from "../../status/subs/Confusion"
import { FRENZIED, Frenzy } from "../../status/subs/Frenzy"
import { Poison, POISONED } from "../../status/subs/Poison"
import { ENRAGED, Rage } from "../../status/subs/Rage"
import { SLOWED, Slowness, SLOWNESS_FACTOR } from "../../status/subs/Slowness"
import { VULNERABILITY_DAMAGE, Vulnerability, VULNERABLE } from "../../status/subs/Vulnerability"
import { WEAKENED, Weakness, WEAKNESS_MALUS } from "../../status/subs/Weakness"
import type { Potion } from "../Potion"

import { StatusPotion } from "./StatusPotion"
import { UNIT } from "../../base/keywords"

export const POISON_POTION = new StatusPotion("poison", [
    "En fin de round, autant de ", new HeartCount(1), " perdus que de rounds restants.",
], POISONED, rounds => new Poison(rounds))

export const SLOWNESS_POTION = new StatusPotion("lenteur", [
    "Agilité × ", frenchNumber(SLOWNESS_FACTOR), " : chaque déplacement va moins loin.",
], SLOWED, rounds => new Slowness(rounds))

export const WEAKNESS_POTION = new StatusPotion("faiblesse", [
    "Force −", frenchNumber(WEAKNESS_MALUS), " : chaque coup fait moins mal.",
], WEAKENED, rounds => new Weakness(rounds))

export const RAGE_POTION = new StatusPotion("rage", [
    "Avant chaque étape, se tourne vers un ennemi au hasard.",
], ENRAGED, rounds => new Rage(rounds))

export const CONFUSION_POTION = new StatusPotion("confusion", [
    "Avant chaque étape, ", frenchNumber(CONFUSION_CHANCE * 100), " % de chances de se tourner n'importe où.",
], CONFUSED, rounds => new Confusion(rounds))

export const VULNERABILITY_POTION = new StatusPotion("vulnérabilité", [
    "Chaque blessure en appelle une autre de ", new HeartCount(VULNERABILITY_DAMAGE), ".",
], VULNERABLE, rounds => new Vulnerability(rounds))

export const FRENZY_POTION = new StatusPotion("frénésie", [
    "Avant chaque étape, se tourne vers l'", UNIT, " la plus proche, alliée ou ennemie.",
], FRENZIED, rounds => new Frenzy(rounds))

/** Every potion, as saved by name. */
export const POTIONS: readonly Potion[] = [
    POISON_POTION, SLOWNESS_POTION, WEAKNESS_POTION, RAGE_POTION, CONFUSION_POTION, VULNERABILITY_POTION,
    FRENZY_POTION,
]
