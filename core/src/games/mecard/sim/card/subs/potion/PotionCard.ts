import type { Text } from "../../../../../../semantic"
import { concat } from "../../../../../../semantic"
import type { Dose, Potion } from "../../../potion/Potion"
import {
    CONFUSION_POTION, FRENZY_POTION, POISON_POTION, RAGE_POTION, SLOWNESS_POTION, VULNERABILITY_POTION,
    WEAKNESS_POTION,
} from "../../../potion/subs/potions"
import { POTION } from "../../CardType"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"

/** A potion, for a card pouring it: a level for a number of rounds, mostly. */
export class PotionCard extends AbstractCard<Dose> {


    public readonly output = POTION
    public readonly input = null

    constructor(
        name: string, rarity: Rarity,
        public readonly potion: Potion,
    ){
        super(name, concat("Potion : ", potion.description), rarity)
        this.#dose = { potion, sign: 1, factor: 1 }
    }


    public get(): Dose {
        return this.#dose
    }


    readonly #dose: Dose
}

/** A card taking a potion and giving it changed: turned around, distilled. */
export class DoseCard extends AbstractCard<Dose, Dose> {


    public readonly output = POTION
    public readonly input = POTION

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** The dose it gives for the dose it takes. */
        public readonly change: (dose: Dose) => Dose,
    ){
        super(name, description, rarity)
    }


    public get(dose: Dose): Dose {
        return this.change(dose)
    }
}

export const POISON = new PotionCard("Poison", Rarity.COMMON, POISON_POTION)
export const SLOWNESS = new PotionCard("Lenteur", Rarity.COMMON, SLOWNESS_POTION)
export const WEAKNESS = new PotionCard("Faiblesse", Rarity.COMMON, WEAKNESS_POTION)
export const RAGE = new PotionCard("Rage", Rarity.RARE, RAGE_POTION)
export const CONFUSION = new PotionCard("Confusion", Rarity.RARE, CONFUSION_POTION)
export const VULNERABILITY = new PotionCard("Vulnérabilité", Rarity.RARE, VULNERABILITY_POTION)
export const FRENZY = new PotionCard("Frénésie", Rarity.EPIC, FRENZY_POTION)

/** A potion turned around: it takes off what it would put on. */
export const ANTIDOTE = new DoseCard("Antidote", [
    "La potion est inversée : elle retire autant de rounds qu'elle en aurait donné.",
], Rarity.COMMON, dose => ({ ...dose, sign: dose.sign === 1 ? -1 : 1 }))

/** How many times stronger the distillation of the catalog makes a potion. */
const DISTILLATION_FACTOR = 2

/** A potion made stronger. */
export const DISTILLATION = new DoseCard("Distillation", [
    "La potion est ", String(DISTILLATION_FACTOR), " fois plus forte.",
], Rarity.EPIC, dose => ({ ...dose, factor: dose.factor * DISTILLATION_FACTOR }))
