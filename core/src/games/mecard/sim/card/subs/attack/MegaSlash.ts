import { MOVE_WIDTH, PHYSICAL_COLOR, MOVE_COLOR } from "../../../battle/previewColors"
import { AGILITE, DISTANCE, FORCE } from "../../../base/keywords"
import type { Action, Pose } from "../../../battle/Action"
import type { Vector2 } from "../../../base/Vector2"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, wait } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { MergedCard } from "../composite/MergedCard"
import { ABOUT_FACE } from "../movement/Orientation"
import { AIM } from "../movement/Aim"
import { FusionCard } from "../composite/FusionCard"
import { DamageType } from "../../../battle/DamageType"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How far the mega slash of the catalog goes through, in meters, before the agility of the unit. */
const MEGA_SLASH_LENGTH = 3

/** How many hearts the mega slash of the catalog takes, before the strength of the unit. */
const MEGA_SLASH_DAMAGE = 1

/** How wide a mega slash cuts, in meters. */
const MEGA_SLASH_WIDTH = 0.5

/** How long it takes to fade out and back in, in seconds. */
const SLASH_TIME = 0.15

/** A jump ahead through everything, cutting every body on the way. */
export class MegaSlashCard extends ActionCard {


    constructor(
        /** How far it goes through, in meters, before the agility of the unit. */
        public readonly length: number,

        /** How many hearts it takes, before the strength of the unit. */
        public readonly amount: number,
    ){
        super("Méga Slash", [
            "Traverse tout sur ", length, "×", AGILITE, " ", DISTANCE, " devant : ", amount, "+", FORCE, " ",
            DamageType.PHYSICAL, " à chaque corps sur le chemin. ",
            "Mal retombé, tu es éjecté à la place libre la plus proche.",
        ], Rarity.EPIC, MegaSlashCard.#slashing(length, amount))
    }


    static #slashing(length: number, amount: number): Action {
        // Where the cut ends, from a pose.
        const reach = (unit: Unit, pose: Pose): Vector2 => {
            return pose.position.plus(pose.direction.times(length * unit.stats.move.value))
        }
        return {
            use: function ({ battle, unit }){
                const to = reach(unit, unit)
                const area = Areas.line(unit.position, to, MEGA_SLASH_WIDTH)
                hold(battle, SLASH_TIME, [Previews.polygon(area, PHYSICAL_COLOR)])
                if(!battle.leap(unit, to)) return
                battle.strike(unit, area, amount + unit.stats.strength.value, DamageType.PHYSICAL)
                battle.unblock(unit)
                wait(battle, SLASH_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const to = reach(unit, pose)
                const area = Areas.line(pose.position, to, MEGA_SLASH_WIDTH)
                const way = Previews.arrow([pose.position, to], MOVE_WIDTH / 2, MOVE_COLOR)
                return Previews.still({ ...pose, position: to }, ...Previews.strike([area], battle.fetch(area, unit)), way, Previews.body(unit, to, pose.direction))
            },
        }
    }
}

export const MEGA_SLASH = new MegaSlashCard(MEGA_SLASH_LENGTH, MEGA_SLASH_DAMAGE)
export const DOUBLE_SLASH = new MergedCard([MEGA_SLASH, ABOUT_FACE, MEGA_SLASH, ABOUT_FACE], {name:"Double Slash", rarity:Rarity.LEGENDARY})
export const TRIPLE_SLASH = new FusionCard([MEGA_SLASH, AIM, MEGA_SLASH, AIM, MEGA_SLASH], {name:"Triple Slash", rarity:Rarity.LEGENDARY})