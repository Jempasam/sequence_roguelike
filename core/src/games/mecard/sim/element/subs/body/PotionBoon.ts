import type { Text } from "../../../../../../semantic"
import type { UnitContext } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"
import { levelOf, pour } from "../../../potion/Potion"
import type { Dose, Potion } from "../../../potion/Potion"

import type { Boon } from "./Boon"

/** A dose of a potion as it is poured: not turned around, not distilled. */
export function pouredDose(potion: Potion): Dose {
    return { potion, sign: 1, factor: 1 }
}

/** A potion poured on the unit. */
export class PotionBoon implements Boon {


    constructor(
        public readonly potion: Potion,
    ){
        this.name = potion.name
        this.text = ["verse ", potion]
    }


    public readonly name: string
    public readonly text: Text

    public give({ battle, unit }: UnitContext, target: Unit): void {
        const dose = pouredDose(this.potion)
        pour(battle, dose, target, levelOf(dose, unit))
    }
}
