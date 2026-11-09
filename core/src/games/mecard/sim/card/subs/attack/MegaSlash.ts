import { MOVE_WIDTH, PHYSICAL_COLOR, MOVE_COLOR } from "../../../battle/previewColors"
import { AGILITE, DISTANCE, FORCE } from "../../../base/keywords"
import type { Action, Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { hold, wait } from "../tools/playing"
import { arrow, polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { MergedCard } from "../composite/MergedCard"
import { ABOUT_FACE } from "../movement/Orientation"
import { FusionCard } from "../composite/FusionCard"
import { TURNS } from "../movement/TurnCard"
import { DamageType } from "../../../battle/DamageType"

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
            "Mal retombé, tu es éjecté pour 1 cœur.",
        ], Rarity.EPIC, MegaSlashCard.#slashing(length, amount))
    }


    static #slashing(length: number, amount: number): Action {
        const cut = (unit: Unit, pose: Pose): Area => {
            const to = pose.position.plus(pose.direction.times(length * unit.stats.move.value))
            return { kind: "segment", from: pose.position, to, width: MEGA_SLASH_WIDTH }
        }
        return {
            use: function* ({ battle, unit }){
                const area = cut(unit, unit)
                if(area.kind !== "segment") return
                yield* hold(battle, SLASH_TIME, [polygon(area, PHYSICAL_COLOR)])
                if(!battle.leap(unit, area.to)) return
                battle.strike(unit, area, amount + unit.stats.strength.value, DamageType.PHYSICAL)
                battle.unblock(unit)
                yield* wait(SLASH_TIME)
            },
            preview: ({ unit, pose }) => {
                const area = cut(unit, pose)
                if(area.kind !== "segment") return still(pose)
                const way = arrow([area.from, area.to], MOVE_WIDTH / 2, MOVE_COLOR)
                return still({ ...pose, position: area.to }, polygon(area, PHYSICAL_COLOR), way)
            },
        }
    }
}

export const MEGA_SLASH = new MegaSlashCard(MEGA_SLASH_LENGTH, MEGA_SLASH_DAMAGE)
export const DOUBLE_SLASH = new MergedCard([MEGA_SLASH, ABOUT_FACE, MEGA_SLASH, ABOUT_FACE], {name:"Double Slash", rarity:Rarity.LEGENDARY})
export const TRIPLE_SLASH = new FusionCard([MEGA_SLASH, TURNS[0], MEGA_SLASH, TURNS[0], MEGA_SLASH], {name:"Triple Slash", rarity:Rarity.LEGENDARY})