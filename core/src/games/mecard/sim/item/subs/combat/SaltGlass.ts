import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import * as Areas from "../../../battle/area/Areas"
import type { Battle } from "../../../battle/Battle"
import type { Preview } from "../../../battle/preview/Preview"
import type { PreviewContext } from "../../../battle/preview/PreviewContext"
import * as Previews from "../../../battle/preview/Previews"
import { RANGE_COLOR } from "../../../battle/previewColors"
import type { Unit } from "../../../battle/Unit"
import type { StatusType } from "../../../status/Status"

import { AbstractItem } from "../AbstractItem"

/** How close another unit must be to catch what its holder suffers, in meters, center to center. */
const SALT_RANGE = 1.15

/** A glass of salt water: the bad statuses its unit gets are also put on the unit nearest to it. */
export class SaltGlass extends AbstractItem {


    constructor(){
        super("Verre d'eau salée", visual("items/salt_glass"), [
            "Tes statuts négatifs sont aussi appliqués à l'unité la plus proche, à ", SALT_RANGE, " m.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        // What is passed on does not pass on again: neither from here, nor from another glass.
        let spreading = false
        const seen = new Map<StatusType, number>()
        const spread = (type: StatusType, delta: number): void => {
            if(spreading || delta <= 0) return
            const nearest = nearestTo(battle, unit)
            if(!nearest) return
            spreading = true
            try {
                battle.applyStatus(nearest, type, delta)
            } finally {
                spreading = false
            }
        }
        hold(battle.signals.statusAdded.add(({ unit: held, type, level }) => {
            if(held !== unit) return
            seen.set(type, level)
            if(type.polarity === "negative") spread(type, level)
        }))
        hold(battle.signals.statusLeveled.add(({ unit: held, type, level }) => {
            if(held !== unit) return
            const before = seen.get(type) ?? 0
            seen.set(type, level)
            if(type.polarity === "negative") spread(type, level - before)
        }))
        hold(battle.signals.statusRemoved.add(({ unit: held, type }) => {
            if(held === unit) seen.delete(type)
        }))
    }

    /** The range of the glass around its unit, and the unit that would catch what it suffers. */
    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const nearest = nearestTo(battle, unit)
        return Previews.still(
            pose,
            Previews.polygon(Areas.circle(pose.position, SALT_RANGE), RANGE_COLOR),
            ...Previews.strike([], nearest ? [nearest] : []),
        )
    }
}

/** The unit nearest to a unit within the range of the glass, none when nobody is that close. */
function nearestTo(battle: Battle, unit: Unit): Unit|null {
    let nearest: Unit|null = null
    for(const other of battle.touchables){
        if(other === unit || other.position.distance(unit.position) > SALT_RANGE) continue
        if(!nearest || other.position.distance(unit.position) < nearest.position.distance(unit.position)) nearest = other
    }
    return nearest
}

export const SALT_GLASS = new SaltGlass()
