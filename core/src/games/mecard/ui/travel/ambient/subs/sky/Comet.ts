import { follow, Rate } from "../../../../../../../engine/particles"
import { visual } from "../../../../../sim/base/Visual"
import { radial } from "../../../../particles/recipes"
import type { Scene } from "../../scene/Scene"
import { sceneEffect } from "../../scene/sceneEffect"
import { wayAcross } from "../../scene/Way"

/** The glowing head of the comet. */
const HALO = visual("ambient/halo")

/** In pixels per second. */
const SPEED = 55

/** The width of the head, in pixels. */
const HEAD = 22

/** A glowing head that crosses the sky slowly, one way or the other, leaving a long trail. */
const SCENE: Scene = {
    playable: () => true,
    create(context){
        const sprite = context.sprite(HALO)
        if(!sprite) return null
        const { additive, random } = context
        const { width, height } = context.size()
        const way = wayAcross(random, 0, width)
        const length = width + HEAD * 2
        const top = height * (0.06 + random() * 0.15)
        const drop = height * 0.2
        const lasting = Math.max(1, 1 / context.scale)
        const trail = new Rate()
        return follow({
            system: additive, sprite, size: HEAD, color: 0xdff0ff, duration: length / SPEED,
            path: progress => ({ x: way.x(length * progress - HEAD), y: top + drop * progress }),
            step: (at, dt) => {
                const sparks = trail.take(50, dt)
                if(sparks === 0) return
                radial(additive, random, at, sparks, {
                    from: 0xbfe0ff, to: 0x3a5adf, size: 6, end: 0, life: 1.4 * lasting, lifeSpread: 0.3,
                }, { speed: 7, speedSpread: 1 })
                radial(additive, random, at, 1, { from: 0xffffff, size: 5, life: 0.12 }, { speed: 0 })
            },
        })
    },
}

/** A comet crosses the sky with its long trail. */
export const COMET = sceneEffect({
    id: "comet", category: "surprise", outdoors: true, weight: 0.5, spacing: 90, scene: SCENE,
})
