import { together } from "../../../../../../../engine/animation"
import { follow, Rate } from "../../../../../../../engine/particles"
import type { Follower } from "../../../../../../../engine/particles"
import { visual } from "../../../../../sim/base/Visual"
import { radial } from "../../../../particles/recipes"
import { castShadow } from "../../scene/castShadow"
import type { Scene } from "../../scene/Scene"
import { sceneEffect } from "../../scene/sceneEffect"
import { wayAcross } from "../../scene/Way"
import { WHALE_FLOORS } from "../../themes"

/** The picture of the whale. */
const WHALE = visual("ambient/whale")

/** The most it is wide, in pixels, and the most of the width of the space. */
const SIZE = 110
const SHARE = 0.4

/** In pixels per second. */
const SPEED = 42

/** An immense pale whale swims across the sky, drops falling from it. */
const SCENE: Scene = {
    playable: () => true,
    create(context){
        const sprite = context.sprite(WHALE)
        if(!sprite) return null
        const { alpha, additive, random } = context
        const { width, height } = context.size()
        const size = Math.min(SIZE, width * SHARE)
        const length = width + size
        const y = height * (0.18 + random() * 0.15)
        const way = wayAcross(random, 0, width)
        const drops = new Rate()
        const whale: Follower = {
            system: alpha, sprite, size, mirrored: way.reversed, opacity: 0.6, duration: length / SPEED,
            path: (progress, age) => ({
                x: way.x(length * progress - size / 2),
                y: y + Math.sin(age * 1.4) * 6,
            }),
            step: (at, dt) => {
                for(let n = drops.take(14, dt); n > 0; n--){
                    const under = { x: at.x + (random() - 0.5) * size * 0.8, y: at.y + size * 0.15 }
                    radial(additive, random, under, 1, {
                        from: 0xbfe0ff, to: 0x5a8adf, size: 2, life: 1.4, lifeSpread: 0.3,
                    }, { speed: 6, gravity: 55 })
                }
            },
        }
        return together([castShadow(context, whale, y), follow(whale)])
    },
}

/** A whale flies by, far above, its shadow far below. */
export const SKY_WHALE = sceneEffect({
    id: "sky-whale", category: "surprise", floors: WHALE_FLOORS, outdoors: true, weight: 0.25, spacing: 180,
    scene: SCENE,
})
