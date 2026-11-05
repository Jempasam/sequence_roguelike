import type { Text } from "../../../../../semantic"
import { colored } from "../../base/Rgba"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import { touches } from "../../battle/Area"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import { BLAST_RADIUS, BOMB_DAMAGE } from "../../card/subs/body/BodyCards"
import { Heart } from "../../heart/Heart"
import { TIME_HEART } from "../../heart/subs/TimeHeartKind"
import { StatusType } from "../../status/Status"
import { HazardStatus, placeHazard } from "../Hazard"

import { HAZARD_TEXT } from "./hazardText"

/** How many rounds the mines of the catalog lie there. */
export const MINE_ROUNDS = 3

/** How wide a mine is, in meters: what has to touch it for it to go off. */
export const MINE_RADIUS = 0.25

/** A mine. */
export const MINE_HAZARD = new StatusType("mine", HAZARD_TEXT, "neutral")

/** A mine: whatever body comes to touch it sets it off, wounding everyone around. */
export class Mined extends HazardStatus {


    public readonly type = MINE_HAZARD

    public toString(): string { return "mine" }

    public toSemString(): Text { return colored(HAZARD_TEXT, this.toString()) }


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
        look: "mine", name: "Mine", zone: { kind: "circle", center, radius: MINE_RADIUS },
        hearts: Heart.many(TIME_HEART, MINE_ROUNDS), status: new Mined(),
    })
}
