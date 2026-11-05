import { rgba } from "../../base/Rgba"
import type { UnitContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { AbstractProcess } from "../AbstractProcess"

/** How many hearts a unit going back to its shadow takes from each body on the way, whatever its stats. */
export const SHADOW_LINK_DAMAGE = 1

/** How wide the way back to a shadow cuts, in meters. */
const SHADOW_LINK_WIDTH = 0.3

/** The closest of the shadows a unit left, none when none is left. */
function closestShadow({ battle, unit }: UnitContext): Unit|null {
    let closest: Unit|null = null
    for(const body of battle.living){
        if(body.summoned !== "shadow" || body.owner !== unit) continue
        const distance = unit.position.distance(body.position)
        if(!closest || distance < unit.position.distance(closest.position)) closest = body
    }
    return closest
}

/**
 * A unit bound to its shadows: as the round ends, it jumps to the closest one, which is spent, wounding each
 * body on the way.
 */
export class ShadowLink extends AbstractProcess {


    constructor(){
        super("lien d'ombre", "shadow_link", rgba(0.5, 0.4, 0.7))
    }


    public dispose(ctx: UnitContext): void {
        const { battle, unit } = ctx
        if(!unit.alive || battle.phase === "over") return
        const shadow = closestShadow(ctx)
        if(!shadow) return
        const from = unit.position
        const to = shadow.position
        if(!battle.leap(unit, to)) return
        shadow.hearts.slay(null)
        const way = { kind: "segment", from, to, width: SHADOW_LINK_WIDTH } as const
        for(const target of battle.unitsIn(way, unit)) target.hearts.damage(SHADOW_LINK_DAMAGE, "physical", unit)
        battle.unblock(unit)
    }
}
