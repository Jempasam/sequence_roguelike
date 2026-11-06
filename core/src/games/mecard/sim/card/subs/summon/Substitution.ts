import { MOVE_COLOR, MOVE_WIDTH } from "../../../battle/previewColors"
import { HeartCount, meters } from "../../../battle/words"
import type { Action } from "../../../battle/Action"

import { ActionCard } from "../ActionCard"
import { DASH_LENGTH, DASH_SPEED } from "../movement/MoveCard"
import { travel, wait } from "../tools/playing"
import { arrow, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { summonedHearts, summonShown } from "./SummonCard"

/** How many hearts the log of the catalog lives by, before the summoning of the unit. */
const LOG_HALVES = 2

/** How long the unit stays still once gone, in seconds. */
const SETTLE_TIME = 0.08

/** A dash backward, a log left where the unit stood, to take the blows meant for it. */
export class SubstitutionCard extends ActionCard {


    constructor(
        /** How far it dashes, in meters, before the agility of the unit. */
        public readonly length: number,

        /** How many hearts the log lives by, before the summoning of the unit. */
        public readonly halves: number,
    ){
        super("Substitution", [
            "Recule de ", meters(length), " sans se retourner, et laisse à ta place un tronc de ", new HeartCount(halves),
            " + invocation, qui prend les coups qui t'étaient destinés.",
        ], Rarity.RARE, SubstitutionCard.#substituting(length, halves))
    }


    static #substituting(length: number, halves: number): Action {
        return {
            use: function* (ctx){
                const { battle, unit } = ctx
                const from = unit.position
                const distance = length * unit.stats.move.value
                const gone = yield* travel(ctx, unit.direction.opposite, distance, DASH_SPEED)
                if(gone.distance > 0) battle.summon(unit, "log", "Tronc", from, summonedHearts(unit, halves))
                yield* wait(SETTLE_TIME)
            },
            preview: ({ battle, unit, pose }) => {
                const distance = length * unit.stats.move.value
                const travelled = battle.travel(unit, pose.position, pose.direction.opposite, distance)
                const dash = arrow([pose.position, travelled.to], MOVE_WIDTH, MOVE_COLOR)
                if(travelled.distance === 0) return still(pose, dash)
                return still({ ...pose, position: travelled.to }, dash, summonShown(pose.position))
            },
        }
    }
}

export const SUBSTITUTION = new SubstitutionCard(DASH_LENGTH, LOG_HALVES)
