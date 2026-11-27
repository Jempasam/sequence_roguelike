import { once, queue } from "../../../../../../../engine/animation"
import type { Scene } from "../../scene/Scene"
import { sceneEffect } from "../../scene/sceneEffect"
import { countIn } from "../../scene/Grain"
import type { Range } from "../../scene/Grain"
import { densityAt } from "../../scene/Spot"
import { shootStar } from "./ShootingStar"

/** How many stars a play has at scale 1. */
const STARS: Range = [8, 12]

/** The seconds between a star and the next at scale 1. */
const GAP = 0.28

/** Shooting stars one after another all over the sky. */
const SCENE: Scene = {
    playable: () => true,
    create(context){
        const { random } = context
        const { width, height } = context.size()
        const density = densityAt(context.scale, 2)
        const count = Math.max(1, Math.round(countIn(random, STARS) * density))
        const lasting = Math.max(1, 1 / context.scale)
        return queue(count, GAP / density, () => once(() => {
            const from = { x: width * random() * 0.8, y: height * (0.03 + random() * 0.4) }
            shootStar(context, from, lasting)
        }))
    },
}

/** A volley of shooting stars crosses the sky. */
export const METEOR_SHOWER = sceneEffect({
    id: "meteor-shower", category: "surprise", outdoors: true, weight: 1, spacing: 40, scene: SCENE,
})
