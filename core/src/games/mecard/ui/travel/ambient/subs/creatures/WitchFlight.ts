import { together } from "../../../../../../../engine/animation"
import { follow, pick, Rate } from "../../../../../../../engine/particles"
import type { Follower } from "../../../../../../../engine/particles"
import { visual } from "../../../../../sim/base/Visual"
import { radial } from "../../../../particles/recipes"
import { castShadow } from "../../scene/castShadow"
import type { Scene } from "../../scene/Scene"
import { sceneEffect } from "../../scene/sceneEffect"
import { wayAcross } from "../../scene/Way"
import { WITCH_FLOORS } from "../../themes"

/** The picture of the witch on her broom. */
const WITCH = visual("ambient/witch")

/** The width of the picture, in pixels. */
const SIZE = 22

/** In pixels per second, along the width. */
const SPEED = 65

/** How far above and below her way she goes, in pixels, and the seconds a wave takes. */
const WAVE = 20
const PERIOD = 1.6

/** The colors of the sparks of her broom. */
const SPARKS = [0xc08aff, 0x8affc0, 0xffe08a]

/** A witch flies across in waves, one way or the other, sparks in her wake. */
const SCENE: Scene = {
    playable: () => true,
    create(context){
        const sprite = context.sprite(WITCH)
        if(!sprite) return null
        const { alpha, additive, random } = context
        const { width, height } = context.size()
        const way = wayAcross(random, 0, width)
        const length = width + SIZE * 2
        const y = height * (0.15 + random() * 0.2)
        const sparks = new Rate()
        const witch: Follower = {
            system: alpha, sprite, size: SIZE, mirrored: way.reversed, duration: length / SPEED,
            path: (progress, age) => ({
                x: way.x(length * progress - SIZE),
                y: y + Math.sin(age / PERIOD * Math.PI * 2) * WAVE,
            }),
            step: (at, dt) => {
                for(let n = sparks.take(34, dt); n > 0; n--){
                    const broom = { x: at.x - way.sign * SIZE * 0.45, y: at.y + SIZE * 0.2 }
                    radial(additive, random, broom, 1, {
                        from: pick(random, SPARKS), size: 2, end: 0, life: 0.8, lifeSpread: 0.3,
                    }, { speed: 9, speedSpread: 1, gravity: 18 })
                }
            },
        }
        return together([castShadow(context, witch, y), follow(witch)])
    },
}

/** A witch weaves by on her broom, her shadow far below. */
export const WITCH_FLIGHT = sceneEffect({
    id: "witch-flight", category: "surprise", floors: WITCH_FLOORS, outdoors: true, weight: 1, spacing: 40,
    scene: SCENE,
})
