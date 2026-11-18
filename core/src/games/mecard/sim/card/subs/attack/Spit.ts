import { rgba } from "../../../base/Rgba"
import { MOVE_WIDTH } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import { UNIT_RADIUS } from "../../../battle/Unit"
import { Slowness, SLOWED } from "../../../status/subs/Slowness"

import { ActionCard } from "../ActionCard"
import { BOLT_WIDTH, fly } from "../tools/bolt"
import { Rarity } from "../../Rarity"
import { DISTANCE, PORTEE, UNIT } from "../../../base/keywords"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How far the spit of the catalog flies, in meters, before the reach of the unit. */
const SPIT_RANGE = 3 - UNIT_RADIUS

/** How many rounds the spit of the catalog slows for: the end of this one counts, so the next one bites. */
const SPIT_ROUNDS = 2

/** The color of a spit in flight. */
const SPIT_COLOR = rgba(0.55, 0.85, 0.3, 0.7)

/** A short shot sticking to the first body it meets, which it slows, with no wound. */
export class SpitCard extends ActionCard {


    constructor(
        /** How far it flies, in meters, before the reach of the unit. */
        public readonly range: number,

        /** How many rounds it slows for. */
        public readonly rounds: number,
    ){
        super("Crachat", [
            "Crache droit devant, jusqu'à ", range, "×", PORTEE, " ", DISTANCE, " : ", new Slowness(rounds), " à la première ",
            UNIT, " touchée, sans dégât.",
        ], Rarity.COMMON, SpitCard.#spitting(range, rounds))
    }


    static #spitting(range: number, rounds: number): Action {
        return {
            use: function ({ battle, unit }){
                const { start, end, unit: hit } = battle.ray(unit, range * unit.stats.throwRange.value)
                fly(battle, start, end, SPIT_COLOR)
                if(hit) battle.applyStatus(hit, SLOWED, rounds)
            },
            preview: ({ battle, unit, pose }) => {
                const { start, end, unit: hit } = battle.ray(unit, range * unit.stats.throwRange.value, pose)
                const area: Area = Areas.line(start, end, BOLT_WIDTH)
                return Previews.still(pose, ...Previews.strike([area], hit ? [hit] : []), Previews.arrow([start, end], MOVE_WIDTH / 2, SPIT_COLOR))
            },
        }
    }
}

export const SPIT = new SpitCard(SPIT_RANGE, SPIT_ROUNDS)
