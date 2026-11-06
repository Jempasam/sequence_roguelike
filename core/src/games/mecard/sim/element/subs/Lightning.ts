import { rgba } from "../../base/Rgba"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import { lineEffect, polygonEffect } from "../../battle/effects"
import type { Unit } from "../../battle/Unit"
import { meters } from "../../battle/words"
import { Haste } from "../../process/subs/Haste"
import { AbstractElement } from "../AbstractElement"
import type { Element } from "../Element"

/** The factor the lightning puts on the agility of a unit, for the round. */
const LIGHTNING_HASTE = 1.5

/** How far the arc it calls strikes around its point, in meters. */
const ARC_RADIUS = 0.8

/** How far the arc jumps from a unit to the next, from center to center, in meters. */
const ARC_JUMP = 2.5

/** How wide the arc is shown, in meters. */
const ARC_WIDTH = 0.06

/** How long the arc stays shown, in seconds. */
const ARC_TIME = 0.3

/** Lightning: it stuns and quickens, and its arc jumps from body to body. */
export class Lightning extends AbstractElement {


    constructor(){
        super(
            "Électricité", rgba(1, 0.95, 0.3), "étourdi",
            "étourdit, sa prochaine étape est repoussée",
            ["+", String((LIGHTNING_HASTE - 1) * 100), " % d'agilité ce round"],
            [
                "un arc : le négatif à ", meters(ARC_RADIUS), " autour, puis il saute de corps en corps, à ",
                meters(ARC_JUMP), ", sans jamais retoucher le même",
            ],
        )
    }


    public applyNegative({ battle }: UnitContext, target: Unit): void {
        battle.stun(target)
    }

    public applyPositive({ battle }: UnitContext, target: Unit): void {
        battle.startProcess(target, new Haste(LIGHTNING_HASTE))
    }

    public invoke(ctx: UnitContext, at: Vector2, _direction: Vector2, effect: Element): void {
        const { battle, unit } = ctx
        const area = { kind: "circle", center: at, radius: ARC_RADIUS } as const
        battle.post(polygonEffect(area, { ...this.color, a: 0.4 }, ARC_TIME))
        const touched = battle.unitsIn(area, unit)
        // Read before any of it acts, so the arc follows the bodies as they stood when it struck.
        for(let index = 0; index < touched.length; index++){
            const from = touched[index]
            for(const next of battle.touchables){
                const inReach = next.position.distance(from.position) <= ARC_JUMP
                if(next === unit || touched.includes(next) || !inReach) continue
                touched.push(next)
                battle.post(lineEffect(from.position, next.position, ARC_WIDTH, this.color, ARC_TIME))
            }
        }
        for(const target of touched) effect.applyNegative(ctx, target)
    }
}

export const LIGHTNING_ELEMENT = new Lightning()
