import type { Text } from "../../../../../semantic"
import { colored } from "../../base/Rgba"
import type { UnitContext } from "../../battle/Action"
import { touches } from "../../battle/Area"
import type { Area } from "../../battle/Area"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import type { Element } from "../../element/Element"
import { Heart } from "../../heart/Heart"
import { TIME_HEART } from "../../heart/subs/TimeHeartKind"
import { StatusType } from "../../status/Status"
import { HazardStatus, placeHazard } from "../Hazard"

import { HAZARD_TEXT } from "./hazardText"

/** Ground on fire. */
export const BURNING_GROUND = new StatusType("sol en feu", HAZARD_TEXT, "neutral")

/** Ground on fire: each unit playing a step on it suffers the negative of an element. */
export class BurningGround extends HazardStatus {


    public readonly type = BURNING_GROUND

    constructor(
        /** The element whose negative it applies. */
        public readonly element: Element,
    ){
        super()
    }


    public toString(): string { return `${BURNING_GROUND} de ${this.element}` }

    public toSemString(): Text { return colored(HAZARD_TEXT, this.toString()) }


    protected plug({ battle, unit }: UnitContext): void {
        this.hold(battle.unitStepping.add(stepping => {
            if(!unit.alive || stepping === unit || !stepping.tangible || !unit.zone) return
            if(!touches(unit.zone, stepping.position, stepping.radius)) return
            this.element.applyNegative({ battle, unit: unit.owner ?? unit }, stepping)
        }))
    }
}

/** Leave flames burning for rounds, for whoever plays a step in them. */
export function placeBurningGround(
    battle: Battle, owner: Unit, zone: Area, rounds: number, element: Element,
): Unit|null {
    return placeHazard(battle, owner, {
        sprite: "fire", name: "Flammes", zone, hearts: Heart.many(TIME_HEART, rounds),
        status: new BurningGround(element),
    })
}
