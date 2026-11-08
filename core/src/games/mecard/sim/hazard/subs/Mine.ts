import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import { touches } from "../../battle/Area"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import { BLAST_RADIUS, BOMB_DAMAGE } from "../../card/subs/body/BodyCards"
import { Heart } from "../../heart/Heart"
import { TIME_HEART } from "../../heart/subs/TimeHeartKind"
import { StatusType, statusVisual } from "../../status/Status"
import { HazardStatus, placeHazard } from "../Hazard"

import { HAZARD_TEXT } from "./hazardText"
import { visual } from "../../base/Visual"

/** How many rounds the mines of the catalog lie there. */
export const MINE_ROUNDS = 3

/** How wide a mine is, in meters: what has to touch it for it to go off. */
export const MINE_RADIUS = 0.25

/** A mine. */
export const MINE_HAZARD = new StatusType("mine", statusVisual("mine", HAZARD_TEXT.r, HAZARD_TEXT.g, HAZARD_TEXT.b), "neutral", level => new Mined(level), { cloned: false, description: "Tout corps qui la touche la déclenche et blesse tous ceux autour." })

/** A mine: whatever body comes to touch it sets it off, wounding everyone around. */
export class Mined extends HazardStatus {


    public readonly type: StatusType = MINE_HAZARD

    protected plug({ battle, unit }: UnitContext): void {
        this.hold(battle.unitMoved.add(({ unit: mover, to }) => {
            if(!unit.alive || mover === unit || !mover.tangible) return
            const zone = unit.zone ?? { kind: "circle", center: unit.position, radius: MINE_RADIUS }
            if(!touches(zone, to, mover.radius)) return
            const blast = { kind: "circle", center: unit.position, radius: BLAST_RADIUS } as const
            battle.explode(blast, BOMB_DAMAGE, unit.owner ?? unit, unit)
            unit.hearts.slay(null)
        }))
    }
}

/** Leave a mine laid by a unit, lying there for some rounds. */
export function placeMine(battle: Battle, owner: Unit, center: Vector2): Unit|null {
    return placeHazard(battle, owner, {
        sprite: visual("units/mine"), name: "Mine", zone: { kind: "circle", center, radius: MINE_RADIUS },
        hearts: Heart.many(TIME_HEART, MINE_ROUNDS), status: { type: MINE_HAZARD, level: 1 },
    })
}
