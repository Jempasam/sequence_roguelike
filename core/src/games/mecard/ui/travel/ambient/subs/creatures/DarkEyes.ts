import { queue } from "../../../../../../../engine/animation"
import { pick, rigid } from "../../../../../../../engine/particles"
import { countIn } from "../../scene/Grain"
import type { Range } from "../../scene/Grain"
import { OFFSTAGE } from "../../scene/offstage"
import type { Scene } from "../../scene/Scene"
import { sceneEffect } from "../../scene/sceneEffect"
import { densityAt } from "../../scene/Spot"
import { ROCK_FLOORS } from "../../themes"

/** How many pairs of eyes a play has at scale 1. */
const PAIRS: Range = [3, 5]

/** The seconds between a pair that opens and the next. */
const GAP = 0.35

/** How long a pair stays open, in seconds. */
const DURATION = 3

/** The ages between which a pair is shut for a blink. */
const BLINKS: readonly Range[] = [[1.1, 1.25], [2.1, 2.2]]

/** The width of an eye, and how far apart the two of a pair are, in pixels. */
const EYE = 2
const APART = 6

/** The colors of the eyes, one for a pair. */
const COLORS = [0xff4030, 0xffd040, 0x7aff70]

/** Pairs of eyes open in the dark one after another, blink and go out. */
const SCENE: Scene = {
    playable: () => true,
    create(context){
        const { additive, random } = context
        const area = context.area()
        const count = Math.max(1, Math.round(countIn(random, PAIRS) * densityAt(context.scale, 2)))
        return queue(count, GAP, () => {
            const at = {
                x: area.x + area.width * (0.05 + random() * 0.9),
                y: area.y + area.height * (0.1 + random() * 0.8),
            }
            const color = pick(random, COLORS)
            const eyes = [-APART / 2, APART / 2].map(side => ({
                size: EYE, color, offset: () => ({ x: side, y: 0 }),
            }))
            return rigid(additive, eyes, DURATION, (_progress, age) => {
                const shut = BLINKS.some(([from, to]) => age >= from && age < to)
                return shut ? OFFSTAGE : at
            })
        })
    },
}

/** Something watches from the dark. */
export const DARK_EYES = sceneEffect({
    id: "dark-eyes", category: "surprise", floors: ROCK_FLOORS, weight: 1, spacing: 40, scene: SCENE,
})
