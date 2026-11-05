import { rgba } from "../../base/Rgba"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { placeWave } from "../../hazard/subs/Surging"
import { Slowness } from "../../status/subs/Slowness"
import { AbstractElement } from "../AbstractElement"
import type { Element } from "../Element"

/** How many rounds the water slows a unit for. */
const WATER_SLOW = 2

/** Water: it slows, washes off what ails a unit, and rolls on as a wave. */
export class Water extends AbstractElement {


    constructor(){
        super(
            "Eau", rgba(0.3, 0.6, 1), "ralenti",
            new Slowness(WATER_SLOW),
            "retire les statuts négatifs",
            "une vague large qui avance : le négatif à chaque corps, une fois, qu'elle repousse dans son sens",
        )
    }


    public applyNegative({ battle }: UnitContext, target: Unit): void {
        battle.applyStatus(target, new Slowness(WATER_SLOW))
    }

    public applyPositive({ battle }: UnitContext, target: Unit): void {
        for(const type of [...target.statuses.keys()]){
            if(type.polarity === "negative") battle.removeStatus(target, type)
        }
    }

    public invoke({ battle, unit }: UnitContext, at: Vector2, direction: Vector2, effect: Element): void {
        placeWave(battle, unit, at, direction, effect)
    }
}

export const WATER_ELEMENT = new Water()
