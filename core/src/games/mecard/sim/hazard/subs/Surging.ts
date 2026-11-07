import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import { STEP } from "../../card/subs/movement/Step"
import type { Element } from "../../element/Element"
import { Heart } from "../../heart/Heart"
import { TIME_HEART } from "../../heart/subs/TimeHeartKind"
import { familyType } from "../../status/Status"
import { elementVariants } from "../../status/StatusVariants"

import { ContactHazard } from "./ContactHazard"
import { HAZARD_TEXT } from "./hazardText"

/** How many rounds a wave lasts. */
const WAVE_ROUNDS = 2

/** How big a wave is, a factor of the radius of a body. */
const WAVE_SIZE = 2

/** How far a wave carries a unit, in meters. */
const WAVE_PUSH = 1.5

/** A wave. */
export const SURGING = familyType("vague", HAZARD_TEXT, "neutral", { cloned: false })

/** The kinds of wave, one for each element. */
export const WAVES = elementVariants(
    SURGING, element => `${SURGING} de ${element}`, (type, level) => new Surging(type, level),
)

/** A wave: a body touching it suffers an element, and is carried along. */
export class Surging extends ContactHazard {


    protected touch(ctx: UnitContext, body: Unit, target: Unit): void {
        this.element.applyNegative(ctx, target)
        ctx.battle.push(target, body.direction, WAVE_PUSH, ctx.unit)
    }
}

/** Call a wave for a unit, rolling on along a direction for its rounds. */
export function placeWave(
    battle: Battle, owner: Unit, at: Vector2, direction: Vector2, element: Element,
): Unit|null {
    const body = battle.place(owner, {
        sprite: "wave", name: "Vague", at, direction, tangible: false, size: WAVE_SIZE,
        hearts: Heart.many(TIME_HEART, WAVE_ROUNDS), cards: [STEP],
    })
    if(body) battle.applyStatus(body, WAVES.of(element), 1)
    return body
}
