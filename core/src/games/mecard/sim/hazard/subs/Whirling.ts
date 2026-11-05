import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import { RANDOM_STEP } from "../../card/subs/body/BodyCards"
import type { Element } from "../../element/Element"
import { Heart } from "../../heart/Heart"
import { TIME_HEART } from "../../heart/subs/TimeHeartKind"
import { StatusType } from "../../status/Status"

import { ContactHazard } from "./ContactHazard"
import { HAZARD_TEXT } from "./hazardText"

/** How many rounds a whirlwind lasts. */
const WHIRLWIND_ROUNDS = 2

/** How many wandering steps a whirlwind plays each round. */
const WHIRLWIND_STEPS = 4

/** How far a whirlwind throws a unit, in meters. */
const WHIRLWIND_THROW = 1.5

/** A whirlwind. */
export const WHIRLING = new StatusType("tourbillon", HAZARD_TEXT, "neutral")

/** A whirlwind: a body touching it is thrown away from it, and suffers an element. */
export class Whirling extends ContactHazard {


    public readonly type = WHIRLING


    protected touch(ctx: UnitContext, body: Unit, target: Unit): void {
        const away = target.position.minus(body.position).normalized ?? target.direction.opposite
        ctx.battle.push(target, away, WHIRLWIND_THROW, ctx.unit)
        this.element.applyNegative(ctx, target)
    }
}

/** Call a whirlwind for a unit, wandering at random for its rounds. */
export function placeWhirlwind(
    battle: Battle, owner: Unit, at: Vector2, direction: Vector2, element: Element,
): Unit|null {
    const body = battle.place(owner, {
        look: "tornado", name: "Tourbillon", at, direction, tangible: false,
        hearts: Heart.many(TIME_HEART, WHIRLWIND_ROUNDS),
        cards: new Array(WHIRLWIND_STEPS).fill(RANDOM_STEP),
    })
    if(body) battle.applyStatus(body, new Whirling(element))
    return body
}
