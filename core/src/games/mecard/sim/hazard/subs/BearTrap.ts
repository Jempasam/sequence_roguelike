import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import * as Areas from "../../battle/area/Areas"
import type { Battle } from "../../battle/Battle"
import { DamageType } from "../../battle/DamageType"
import type { Unit } from "../../battle/Unit"
import { Heart } from "../../heart/Heart"
import { TIME_HEART } from "../../heart/subs/TimeHeartKind"
import { StatusType, statusVisual } from "../../status/Status"
import { HazardStatus, placeHazard } from "../Hazard"

import { HAZARD_TEXT } from "./hazardText"
import { visual } from "../../base/Visual"

/** How many rounds the bear traps of the catalog lie there. */
export const BEAR_TRAP_ROUNDS = 3

/** How wide a bear trap is, in meters: what has to touch it for it to snap. */
export const BEAR_TRAP_RADIUS = 0.3

/** How many hearts a bear trap takes from the unit it catches. */
export const BEAR_TRAP_DAMAGE = 2

/** A bear trap. */
export const BEAR_TRAP_HAZARD = new StatusType("piège à ours", statusVisual("mine", HAZARD_TEXT.r, HAZARD_TEXT.g, HAZARD_TEXT.b), "neutral", level => new Trapping(level), { cloned: false, description: "Le premier corps qui la touche est blessé et perd sa prochaine étape." })

/** A bear trap: the first body to touch it is wounded and stunned, and the trap is gone. */
export class Trapping extends HazardStatus {


    public readonly type: StatusType = BEAR_TRAP_HAZARD

    protected plug({ battle, unit }: UnitContext): void {
        this.hold(battle.unitMoved.add(({ unit: mover, to }) => {
            if(!unit.alive || mover === unit || !mover.tangible) return
            const zone = unit.zone ?? Areas.circle(unit.position, BEAR_TRAP_RADIUS)
            if(!Areas.checkCircle(zone, to, mover.radius)) return
            mover.hearts.damage(BEAR_TRAP_DAMAGE, DamageType.PHYSICAL, unit.owner ?? unit)
            battle.stun(mover)
            unit.hearts.slay(null)
        }))
    }
}

/** Leave a bear trap laid by a unit, lying there for some rounds. */
export function placeBearTrap(battle: Battle, owner: Unit, center: Vector2): Unit|null {
    return placeHazard(battle, owner, {
        sprite: visual("units/mine"), name: "Piège à ours", at: center, zone: Areas.circle(center, BEAR_TRAP_RADIUS),
        hearts: Heart.many(TIME_HEART, BEAR_TRAP_ROUNDS), status: { type: BEAR_TRAP_HAZARD, level: 1 },
    })
}
