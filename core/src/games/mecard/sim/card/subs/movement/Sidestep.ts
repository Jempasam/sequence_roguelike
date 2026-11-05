import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { meters } from "../../../battle/words"
import type { Action } from "../../../battle/Action"

import { ActionCard } from "../ActionCard"
import { travel, wait, WALK_SPEED } from "../tools/playing"
import { arrow, label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { STEP_LENGTH } from "./Step"

/** How long the unit stays still after its step, in seconds. */
const SETTLE_TIME = 0.08

/** A step to one side, drawn when it plays, without turning: out of the line of what stands ahead. */
export class SidestepCard extends ActionCard {


    constructor(
        /** How far it goes, in meters, before the agility of the unit. */
        public readonly length: number,
    ){
        super("Pas de côté", [
            "Se décale de ", meters(length), " à gauche ou à droite, au hasard, sans se retourner.",
        ], Rarity.COMMON, SidestepCard.#stepping(length))
    }


    static #stepping(length: number): Action {
        return {
            use: function* (ctx){
                const { battle, unit } = ctx
                const right = unit.direction.right
                const way = battle.rng.pick([right, right.opposite]) ?? right
                yield* travel(ctx, way, length * unit.stats.move.value, WALK_SPEED)
                yield* wait(SETTLE_TIME)
            },
            // The draw is not known yet: both sides show, and the unit stays where it stands.
            preview: ({ battle, unit, pose }) => {
                const distance = length * unit.stats.move.value
                const right = pose.direction.right
                const sides = [right, right.opposite].map(way => {
                    const gone = battle.travel(unit, pose.position, way, distance)
                    return arrow([pose.position, gone.to], MOVE_WIDTH, MOVE_COLOR)
                })
                return still(pose, ...sides, label(pose.position, "au hasard", NOTE_COLOR))
            },
        }
    }
}

export const SIDESTEP = new SidestepCard(STEP_LENGTH / 2)
