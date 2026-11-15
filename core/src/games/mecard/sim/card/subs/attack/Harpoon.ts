import { rgba } from "../../../base/Rgba"
import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { AGILITE, DISTANCE, PORTEE, PRECISION } from "../../../base/keywords"
import type { Action } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"

import { ActionCard } from "../ActionCard"
import { BOLT_WIDTH, fly } from "../tools/bolt"
import { travel } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { DamageType } from "../../../battle/DamageType"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How far the harpoon of the catalog flies, in meters, before the reach of the unit. */
const HARPOON_RANGE = 4

/** How many hearts the harpoon of the catalog takes, before the precision of the unit. */
const HARPOON_DAMAGE = 1

/** How far the harpoon of the catalog pulls its unit, in meters, before its agility. */
const HARPOON_PULL = 2

/** How fast a harpoon pulls, in meters per second. */
const PULL_SPEED = 10

/** The color of a harpoon flying out. */
const HARPOON_COLOR = rgba(0.7, 0.8, 0.85, 0.9)

/** A harpoon thrown ahead: it wounds the first body it meets, and pulls its unit that way. */
export class HarpoonCard extends ActionCard {


    constructor(
        /** How far it flies, in meters, before the reach of the unit. */
        public readonly range: number,

        /** How many hearts it takes, before the precision of the unit. */
        public readonly amount: number,

        /** How far it pulls its unit, in meters, before its agility. */
        public readonly pull: number,
    ){
        super("Harpon", [
            "Lance un harpon droit devant, jusqu'à ", range, "×", PORTEE, " ", DISTANCE, ". S'il touche : ", amount, "+",
            PRECISION, " ", DamageType.PHYSICAL, ", et tu es tiré de ", pull, "×", AGILITE, " ", DISTANCE,
            " vers la cible.",
        ], Rarity.RARE, HarpoonCard.#harpooning(range, amount, pull))
    }


    static #harpooning(range: number, amount: number, pull: number): Action {
        const reach = (unit: Unit): number => range * unit.stats.throwRange.value
        const pulled = (unit: Unit): number => pull * unit.stats.move.value
        return {
            use: function (ctx){
                const { battle, unit } = ctx
                const { end, unit: target } = battle.ray(unit, reach(unit))
                fly(battle, unit.position, end, HARPOON_COLOR)
                if(!target) return
                const area = Areas.line(unit.position, end, BOLT_WIDTH)
                battle.strike(unit, area, amount + unit.stats.precision.value, DamageType.PHYSICAL)
                if(target.alive) travel(ctx, unit.direction, pulled(unit), PULL_SPEED)
            },
            preview: ({ battle, unit, pose }) => {
                const { end, unit: target } = battle.ray(unit, reach(unit), pose)
                const rope = Previews.arrow([pose.position, end], MOVE_WIDTH / 2, HARPOON_COLOR)
                if(!target) return Previews.still(pose, rope, Previews.label(end, "raté", NOTE_COLOR))
                const gone = battle.moveSpot(unit, pose.position, pose.direction, pulled(unit))
                const pull = Previews.arrow([pose.position, gone.to], MOVE_WIDTH, MOVE_COLOR)
                return Previews.still({ ...pose, position: gone.to }, rope, pull, ...Previews.strike([], [target]))
            },
        }
    }
}

export const HARPOON = new HarpoonCard(HARPOON_RANGE, HARPOON_DAMAGE, HARPOON_PULL)
