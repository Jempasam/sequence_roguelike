import { rgba } from "../../../base/Rgba"
import { MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { ALLONGE, DISTANCE, FORCE } from "../../../base/keywords"
import type { Action } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"
import { DamageType } from "../../../battle/DamageType"
import { Skewering } from "../../../process/subs/Skewering"

import { ActionCard } from "../ActionCard"
import { BOLT_WIDTH, fly } from "../tools/bolt"
import { Rarity } from "../../Rarity"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How far the spear of the catalog flies, in meters, before the reach of the unit's blows. */
const SPEAR_RANGE = 3

/** How many hearts the spear of the catalog takes, before the strength of the unit. */
const SPEAR_DAMAGE = 1

/** The color of a spear flying out. */
const SPEAR_COLOR = rgba(0.85, 0.85, 0.95, 0.9)

/** A spear thrown ahead: it wounds the first body it meets, and its thrower follows that body from then on. */
function throwing(range: number, amount: number): Action {
    const reach = (unit: Unit): number => range * unit.stats.meleeRange.value
    return {
        use: function ({ battle, unit }){
            const { end, unit: target } = battle.ray(unit, reach(unit))
            fly(battle, unit.position, end, SPEAR_COLOR)
            if(!target) return
            const area = Areas.line(unit.position, end, BOLT_WIDTH)
            battle.strike(unit, area, amount + unit.stats.strength.value, DamageType.PHYSICAL)
            if(target.alive) battle.startProcess(unit, new Skewering(target))
        },
        preview: ({ battle, unit, pose }) => {
            const { end, unit: target } = battle.ray(unit, reach(unit), pose)
            const shaft = Previews.arrow([pose.position, end], MOVE_WIDTH / 2, SPEAR_COLOR)
            if(!target) return Previews.still(pose, shaft, Previews.label(end, "raté", NOTE_COLOR))
            return Previews.still(pose, shaft, ...Previews.strike([], [target]), Previews.label(target.position, "lance", NOTE_COLOR))
        },
    }
}

export const PIERCING_SPEAR = new ActionCard("Lance perforante", [
    "Lance une lance droit devant, jusqu'à ", SPEAR_RANGE, "×", ALLONGE, " ", DISTANCE, " : ", SPEAR_DAMAGE, "+", FORCE, " ",
    DamageType.PHYSICAL, " à la première cible. Elle reste plantée jusqu'à la fin du round : tu suis cette cible quand ",
    "elle bouge ou se tourne. Tout autre déplacement de ta part retire la lance.",
], Rarity.RARE, throwing(SPEAR_RANGE, SPEAR_DAMAGE))
