import type { UnitContext } from "../../battle/Action"
import { touches } from "../../battle/Area"
import type { Area } from "../../battle/Area"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import type { Element } from "../../element/Element"
import { Heart } from "../../heart/Heart"
import { TIME_HEART } from "../../heart/subs/TimeHeartKind"
import { familyType, statusVisual } from "../../status/Status"
import { elementVariants } from "../../status/StatusVariants"
import type { ElementType } from "../../status/StatusVariants"
import { HazardStatus, placeHazard } from "../Hazard"

import { HAZARD_TEXT } from "./hazardText"
import { visual } from "../../base/Visual"

/** Ground on fire. */
export const BURNING_GROUND = familyType("sol en feu", statusVisual("burning_ground", HAZARD_TEXT.r, HAZARD_TEXT.g, HAZARD_TEXT.b), "neutral", { cloned: false, description: "Chaque unité qui joue un pas dessus subit le négatif d'un élément." })

/** The kinds of ground on fire, one for each element. */
export const BURNING_GROUNDS = elementVariants(
    BURNING_GROUND, element => `${BURNING_GROUND} de ${element}`, (type, level) => new BurningGround(type, level),
)

/** Ground on fire: each unit playing a step on it suffers the negative of an element. */
export class BurningGround extends HazardStatus {


    constructor(
        public readonly type: ElementType,
        level: number,
    ){
        super(level)
    }


    /** The element whose negative it applies. */
    public get element(): Element { return this.type.element }


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
        sprite: visual("units/fire"), name: "Flammes", zone, hearts: Heart.many(TIME_HEART, rounds),
        status: { type: BURNING_GROUNDS.of(element), level: 1 },
    })
}
