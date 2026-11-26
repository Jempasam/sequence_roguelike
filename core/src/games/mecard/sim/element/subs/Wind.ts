import { rgba } from "../../base/Rgba"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import { EIGHT_WAYS } from "../../battle/rules"
import type { Unit } from "../../battle/Unit"
import { DISTANCE } from "../../base/keywords"
import { DamageType } from "../../battle/DamageType"
import { VIOLENT_PUSH } from "../../battle/mecanic/push/keyword"
import { PUSH_DAMAGE } from "../../battle/mecanic/push/shove"
import * as Pushing from "../../battle/mecanic/push"
import * as Walk from "../../battle/mecanic/walk"
import { placeWhirlwind } from "../../hazard/subs/Whirling"
import { AbstractElement } from "../AbstractElement"
import type { Element } from "../Element"

/** How far the wind pushes a unit, in meters. */
export const WIND_PUSH = 2

/** Wind: it throws a unit any way, and sends it on its way. */
export class Wind extends AbstractElement {


    constructor(){
        super(
            "Vent", rgba(0.8, 1, 0.85), "emporté",
            [
                VIOLENT_PUSH.as("pousse violemment"), " de ", WIND_PUSH, " ", DISTANCE, " dans une direction au hasard (choc : ",
                PUSH_DAMAGE, " ", DamageType.PHYSICAL, ")",
            ],
            ["pousse de ", WIND_PUSH, " ", DISTANCE, " droit devant"],
            [
                "un tourbillon qui erre au hasard : au contact, il ", VIOLENT_PUSH.as("pousse violemment"),
                " et applique le négatif",
            ],
        )
    }


    public applyNegative({ battle, unit }: UnitContext, target: Unit): void {
        Pushing.shoveViolently({
            battle, by: unit, target, direction: battle.rng.pick(EIGHT_WAYS) ?? target.direction, distance: WIND_PUSH,
            damage: PUSH_DAMAGE, atOnce: true,
        })
    }

    public applyPositive({ battle }: UnitContext, target: Unit): void {
        Walk.move(battle, target, target.direction, WIND_PUSH, true)
    }

    public invoke({ battle, unit }: UnitContext, at: Vector2, direction: Vector2, effect: Element): void {
        placeWhirlwind(battle, unit, at, direction, effect)
    }
}

export const WIND_ELEMENT = new Wind()
