import { MOVE_COLOR, MOVE_WIDTH, NOTE_COLOR } from "../../../battle/previewColors"
import { AGILITE, DISTANCE, FORCE } from "../../../base/keywords"
import type { Preview, PreviewContext } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"
import type { Process } from "../../../process/Process"
import { Riding } from "../../../process/subs/Riding"
import { Strength } from "../../../process/subs/Strength"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME, TRAVEL_SLACK } from "../tools/playing"
import { arrow, label, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import type { Text } from "../../../../../../semantic"

/** How many hearts the strength of the catalog adds to each blow, for its round. */
const STRENGTH_BONUS = 1

/** How far the horse of the catalog carries its rider before each step, in meters: half a step. */
const RIDE_LENGTH = 1

/** An action starting a process for its unit, until the end of the round. */
export class ProcessCard extends ActionCard {


    constructor(
        name: string, description: Text, rarity: Rarity,

        /** What it starts, made anew each time it plays. */
        public readonly process: (unit: Unit) => Process,

        /** What its preview says on its unit. */
        word: string,

        /** What it does beyond saying so, from the pose it plays at, nothing by default. */
        effect?: (ctx: PreviewContext) => Preview,
    ){
        super(name, description, rarity, {
            use: function* ({ battle, unit }){
                battle.startProcess(unit, process(unit))
                yield* hold(battle, SHORT_TIME, [label(unit.position, word, NOTE_COLOR)])
            },
            preview: ctx => {
                const said = label(ctx.pose.position, word, NOTE_COLOR)
                if(!effect) return still(ctx.pose, said)
                const done = effect(ctx)
                return { ...done, indicators: [said, ...done.indicators] }
            },
        })
    }
}

/** What a ride of the horse of the catalog would do from a pose: as far as nothing is in the way. */
function ridden({ battle, unit, pose }: PreviewContext): Preview {
    const distance = RIDE_LENGTH * unit.stats.move.value
    const gone = battle.travel(unit, pose.position, pose.direction, distance)
    const indicators = [arrow([pose.position, gone.to], MOVE_WIDTH, MOVE_COLOR)]
    if(gone.distance < distance - TRAVEL_SLACK) indicators.push(label(gone.to, "bloqué", NOTE_COLOR))
    return { indicators, pose: { position: gone.to, direction: pose.direction } }
}

export const STRENGTH_CARD = new ProcessCard("Force", [
    "+", STRENGTH_BONUS, " ", FORCE, " jusqu'à la fin du round.",
], Rarity.COMMON, () => new Strength(STRENGTH_BONUS), "force")

export const HORSE = new ProcessCard("Cheval", [
    "Jusqu'à la fin du round, avance de ", RIDE_LENGTH, "×", AGILITE, " ", DISTANCE, " tout de suite, puis avant chacune de tes étapes.",
], Rarity.RARE, () => new Riding(RIDE_LENGTH), "au galop", ctx => ({ ...ridden(ctx), beforeStep: ridden }))
