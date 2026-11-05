import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import type { Element } from "../../element/Element"
import { Heart } from "../../heart/Heart"
import { RED_HEART } from "../../heart/subs/RedHeartKind"
import { StatusType } from "../../status/Status"

import { ContactHazard } from "./ContactHazard"
import { HAZARD_TEXT } from "./hazardText"

/** How many hearts a boulder lives by, before the summoning of the unit. */
const BOULDER_HEARTS = 2

/** A boulder. */
export const ROCKY = new StatusType("rocher", HAZARD_TEXT, "neutral")

/** A boulder: a body touching it suffers an element. */
export class Rocky extends ContactHazard {


    public readonly type = ROCKY


    protected touch(ctx: UnitContext, _body: Unit, target: Unit): void {
        this.element.applyNegative(ctx, target)
    }
}

/** Call a boulder for a unit: a body standing in the way, which wears away as a summoned body does. */
export function placeBoulder(
    battle: Battle, owner: Unit, at: Vector2, direction: Vector2, element: Element,
): Unit|null {
    const hearts = Heart.many(RED_HEART, BOULDER_HEARTS + owner.stats.summon.value)
    const body = battle.summon(owner, "rock", "Rocher", at, hearts, direction)
    if(body) battle.applyStatus(body, new Rocky(element))
    return body
}
