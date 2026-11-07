import type { ImagePath } from "../../../../../../engine/assets/Assets"
import type { Text } from "../../../../../../semantic"
import type { UnitContext } from "../../../battle/Action"
import { meters } from "../../../battle/words"
import type { Status } from "../../../status/Status"
import { Bleeding, Fragility } from "../../../status/subs/Wounds"

import { AbstractUsable } from "../AbstractUsable"
import type { UsableOptions } from "../AbstractUsable"
import { UNIT } from "../../../base/keywords"

/** How far the flasks of this file fly, in meters, before the range of the unit, and how wide they splash. */
const FLASK_FLIGHT = 5
const FLASK_SPLASH = 1

/** A flask thrown straight ahead, to where it meets a body, putting a status on every unit around where it lands. */
export class SplashFlask extends AbstractUsable {


    constructor(
        name: string, icon: ImagePath, description: Text, options: UsableOptions,

        /** The status each unit it splashes gets. */
        public readonly make: () => Status,
    ){
        super(name, icon, description, options)
    }


    protected act({ battle, unit }: UnitContext): void {
        const { end } = battle.ray(unit, FLASK_FLIGHT * unit.stats.throwRange.value)
        const given = this.make()
        for(const other of battle.unitsIn({ kind: "circle", center: end, radius: FLASK_SPLASH }, unit)){
            battle.applyStatus(other, given.type, given.level)
        }
    }
}

export const BLOOD_FLASK = new SplashFlask(
    "Fiole de sang", "mecard/usables/fire_flask.png",
    [
        "Lancée à ", meters(FLASK_FLIGHT), " × portée devant : chaque ", UNIT, " à ", meters(FLASK_SPLASH),
        " de l'impact gagne un round de saignement. 2 utilisations, rechargées à chaque combat.",
    ],
    { charges: 2, refill: "battle" }, () => new Bleeding(1),
)

export const FRAGILITY_FLASK = new SplashFlask(
    "Fiole de fragilité", "mecard/usables/glue_flask.png",
    [
        "Lancée à ", meters(FLASK_FLIGHT), " × portée devant : chaque ", UNIT, " à ", meters(FLASK_SPLASH),
        " de l'impact devient fragile pendant 2 rounds.",
    ],
    {}, () => new Fragility(2),
)
