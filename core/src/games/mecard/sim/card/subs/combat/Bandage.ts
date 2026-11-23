import { HEAL } from "../../../base/keywords"
import { rgba } from "../../../base/Rgba"
import { HeartCount } from "../../../battle/words"
import type { Action } from "../../../battle/Action"

import { ActionCard } from "../ActionCard"
import { SHORT_TIME, wait } from "../tools/playing"
import { Rarity } from "../../Rarity"
import * as Previews from "../../../battle/preview/Previews"

/** How many hearts the bandage of the catalog heals, before the healing of the unit. */
const BANDAGE_HEAL = 2

/** The color of the word of a heal. */
const HEAL_COLOR = rgba(0.5, 1, 0.5)

/** A bandage, healing its unit. */
export class BandageCard extends ActionCard {


    constructor(
        /** How many hearts it heals, before the healing of the unit. */
        public readonly halves: number,
    ){
        super("Bandage", ["Soigne ", new HeartCount(halves), " + ", HEAL, "."], Rarity.COMMON, BandageCard.#healing(halves))
    }


    static #healing(halves: number): Action {
        return {
            use: ({ battle, unit }) => {
                unit.hearts.heal(halves + unit.stats.heal.value)
                wait(battle, SHORT_TIME)
            },
            preview: ({ unit, pose }) => Previews.still(pose, Previews.label(pose.position, `+${halves + unit.stats.heal.value}`, HEAL_COLOR)),
        }
    }
}

export const BANDAGE = new BandageCard(BANDAGE_HEAL)
