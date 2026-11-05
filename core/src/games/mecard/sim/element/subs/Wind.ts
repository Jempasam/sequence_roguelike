import { rgba } from "../../base/Rgba"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import { EIGHT_WAYS } from "../../battle/rules"
import type { Unit } from "../../battle/Unit"
import { meters } from "../../battle/words"
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
            ["pousse de ", meters(WIND_PUSH), " dans une direction au hasard"],
            ["pousse de ", meters(WIND_PUSH), " droit devant"],
            "un tourbillon qui erre au hasard : au contact, il repousse et applique le négatif",
        )
    }


    public applyNegative({ battle, unit }: UnitContext, target: Unit): void {
        battle.push(target, battle.rng.pick(EIGHT_WAYS) ?? target.direction, WIND_PUSH, unit)
    }

    public applyPositive({ battle }: UnitContext, target: Unit): void {
        battle.move(target, target.direction, WIND_PUSH, true)
    }

    public invoke({ battle, unit }: UnitContext, at: Vector2, direction: Vector2, effect: Element): void {
        placeWhirlwind(battle, unit, at, direction, effect)
    }
}

export const WIND_ELEMENT = new Wind()
