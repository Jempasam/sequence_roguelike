import { CONTROL_COLOR, NOTE_COLOR } from "../../../battle/previewColors"
import type { Action, Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { TOUCH_RANGE, touchZone } from "./touch"
import { DISTANCE, UNIT } from "../../../base/keywords"
import { DamageType } from "../../../battle/DamageType"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How many hearts the taser of the catalog takes. */
const TASER_DAMAGE = 1

/**
 * How wide the taser is, in meters: a thin line, which stops on the edge of the body it meets, so it needs
 * a little width to still touch it once rounded.
 */
const TASER_WIDTH = 0.1

/** The line the taser follows, from a pose, up to the first body. */
function zap(battle: Battle, unit: Unit, pose: Pose): Area {
    const { start, end } = battle.ray(unit, TOUCH_RANGE, pose)
    return Areas.line(start, end, TASER_WIDTH)
}

/** A shock to the unit just ahead, losing it its next step. */
export class TaserCard extends ActionCard {


    constructor(
        /** How many hearts it takes. */
        public readonly damage: number,
    ){
        super("Taser", [
            "Électrocute l'", UNIT, " juste devant, à ", TOUCH_RANGE, " ", DISTANCE, " : ", damage, " ", DamageType.PHYSICAL,
            ", et sa prochaine étape est perdue.",
        ], Rarity.RARE, TaserCard.#shocking(damage))
    }


    static #shocking(amount: number): Action {
        return {
            use: function ({ battle, unit }){
                const area = zap(battle, unit, unit)
                const struck = battle.strike(unit, area, amount, DamageType.PHYSICAL)
                for(const target of struck) battle.shock(target)
                hold(battle, SHORT_TIME, [Previews.polygon(area, CONTROL_COLOR)])
            },
            preview: ({ battle, unit, pose }) => {
                const { unit: target } = battle.ray(unit, TOUCH_RANGE, pose)
                const shown = Previews.polygon(zap(battle, unit, pose), CONTROL_COLOR)
                if(!target) return Previews.still(pose, touchZone(unit, pose), shown)
                return Previews.still(pose, touchZone(unit, pose), shown, Previews.label(target.position, "électrocuté", NOTE_COLOR))
            },
        }
    }
}

export const TASER = new TaserCard(TASER_DAMAGE)
