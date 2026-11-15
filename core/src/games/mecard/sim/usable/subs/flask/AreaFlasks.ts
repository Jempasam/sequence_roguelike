import type { Visual } from "../../../base/Visual"
import type { Text } from "../../../../../../semantic"
import type { Pose, UnitContext } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Preview } from "../../../battle/preview/Preview"
import type { PreviewContext } from "../../../battle/preview/PreviewContext"
import * as Previews from "../../../battle/preview/Previews"
import type { Unit } from "../../../battle/Unit"
import type { Status } from "../../../status/Status"
import { Bleeding, Fragility } from "../../../status/subs/Wounds"

import { AbstractUsable } from "../AbstractUsable"
import type { UsableOptions } from "../AbstractUsable"
import { DISTANCE, PORTEE, UNIT } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import * as Areas from "../../../battle/area/Areas"

/** How far the flasks of this file fly, in meters, before the range of the unit, and how wide they splash. */
const FLASK_FLIGHT = 5
const FLASK_SPLASH = 1

/** A flask thrown straight ahead, to where it meets a body, putting a status on every unit around where it lands. */
export class SplashFlask extends AbstractUsable {


    constructor(
        name: string, icon: Visual, description: Text, options: UsableOptions,

        /** The status each unit it splashes gets. */
        public readonly make: () => Status,
    ){
        super(name, icon, description, options)
    }


    protected act({ battle, unit }: UnitContext): void {
        const given = this.make()
        for(const other of battle.fetch(this.#splash(battle, unit, unit), unit)){
            battle.applyStatus(other, given.type, given.level)
        }
    }

    public preview({ battle, unit, pose }: PreviewContext): Preview {
        const splash = this.#splash(battle, unit, pose)
        return Previews.still(pose, ...Previews.strike([splash], battle.fetch(splash, unit)))
    }


    /** Where it splashes when thrown from a pose: around where it meets a body. */
    #splash(battle: Battle, unit: Unit, pose: Pose): Area {
        const { end } = battle.ray(unit, FLASK_FLIGHT * unit.stats.throwRange.value, pose)
        return Areas.circle(end, FLASK_SPLASH)
    }
}

export const BLOOD_FLASK = new SplashFlask(
    "Fiole de sang", visual("usables/fire_flask"),
    [
        "Lancée à ", FLASK_FLIGHT, "×", PORTEE, " ", DISTANCE, " devant : chaque ", UNIT, " à ", FLASK_SPLASH, " ", DISTANCE,
        " de l'impact gagne un round de saignement. 2 utilisations, rechargées à chaque combat.",
    ],
    { charges: 2, refill: "battle" }, () => new Bleeding(1),
)

export const FRAGILITY_FLASK = new SplashFlask(
    "Fiole de fragilité", visual("usables/glue_flask"),
    [
        "Lancée à ", FLASK_FLIGHT, "×", PORTEE, " ", DISTANCE, " devant : chaque ", UNIT, " à ", FLASK_SPLASH, " ", DISTANCE,
        " de l'impact devient fragile pendant 2 rounds.",
    ],
    {}, () => new Fragility(2),
)
