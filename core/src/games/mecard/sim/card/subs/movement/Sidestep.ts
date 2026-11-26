import { MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { AGILITE, DISTANCE } from "../../../base/keywords"
import type { Action } from "../../../battle/Action"

import { ActionCard } from "../ActionCard"
import { wait } from "../tools/playing"
import { WALK } from "../../../battle/mecanic/walk/keyword"
import * as Walk from "../../../battle/mecanic/walk"
import { Rarity } from "../../Rarity"
import { STEP_LENGTH } from "./Step"
import * as Previews from "../../../battle/preview/Previews"

/** How long the unit stays still after its step, in seconds. */
const SETTLE_TIME = 0.08

/** A step to one side, drawn when it plays, without turning: out of the line of what stands ahead. */
export class SidestepCard extends ActionCard {


    constructor(
        /** How far it goes, in meters, before the agility of the unit. */
        public readonly length: number,
    ){
        super("Pas de côté", [
            WALK.as("Se décale"), " de ", length, "×", AGILITE, " ", DISTANCE, " à gauche ou à droite, au hasard, sans se retourner.",
        ], Rarity.COMMON, SidestepCard.#stepping(length))
    }


    static #stepping(length: number): Action {
        return {
            use: function (ctx){
                const { battle, unit } = ctx
                const right = unit.direction.right
                const way = battle.rng.pick([right, right.opposite]) ?? right
                Walk.travel(ctx, way, length * unit.stats.move.value, Walk.WALK_SPEED)
                wait(battle, SETTLE_TIME)
            },
            // The draw is not known yet: both sides show, and the unit stays where it stands.
            preview: ({ battle, unit, pose }) => {
                const distance = length * unit.stats.move.value
                const right = pose.direction.right
                const sides = [right, right.opposite].map(way => {
                    const gone = Walk.spot(battle, unit, pose.position, way, distance)
                    const full = pose.position.plus(way.times(distance))
                    return Previews.moving(unit, pose.position, full, gone.to, MOVE_WIDTH)
                })
                return Previews.still(pose, ...sides.flat(), Previews.label(pose.position, "au hasard", NOTE_COLOR))
            },
        }
    }
}

export const SIDESTEP = new SidestepCard(STEP_LENGTH / 2)
