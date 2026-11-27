import { after, together } from "../../../../../../../engine/animation"
import { follow } from "../../../../../../../engine/particles"
import { visual } from "../../../../../sim/base/Visual"
import { OFFSTAGE } from "../../scene/offstage"
import type { Scene } from "../../scene/Scene"
import { sceneEffect } from "../../scene/sceneEffect"
import { sideEdge } from "../../scene/Spot"
import { drift } from "../../scene/subs/drift"
import { wayAcross } from "../../scene/Way"
import { DRAGON_FLOORS } from "../../themes"

/** The two pictures of its flight: wings up, then wings down. */
const WINGS = [visual("ambient/dragon_up"), visual("ambient/dragon_down")]

/** The most it is wide, in pixels, and the most of the width of the space. */
const SIZE = 180
const SHARE = 0.6

/** In pixels per second. */
const SPEED = 140

/** The seconds each picture shows before the other one. */
const BEAT = 0.35

/** The dust and the air it raises behind it, going its way. */
function windOf(reversed: boolean): Scene {
    return drift({
        spot: sideEdge(0.2, 0.9), duration: 1.6, swell: 0.5, reversed,
        layers: [
            {
                grain: { colors: [0xe6f2ff], size: [10, 18], opacity: 0.18, glow: true },
                rate: 9, life: 2.5, cross: [1.2, 1.8], vy: [5, 20], grows: 4, fades: true, stretched: true,
            },
            {
                grain: { colors: [0xb8a88a], size: [2, 2], opacity: 0.7 },
                rate: 12, life: 3, cross: [1.6, 2.6], vy: [10, 20], ay: [-40, 40], fades: true,
            },
        ],
    })
}

/** The shadow of a dragon sweeps over the space, beating its wings, the wind in its wake. */
const SCENE: Scene = {
    playable: () => true,
    create(context){
        const pictures = WINGS.map(wing => context.sprite(wing))
        if(pictures.includes(null)) return null
        const { alpha, random } = context
        const { width, height } = context.size()
        const size = Math.min(SIZE, width * SHARE)
        const length = width + size
        const duration = length / SPEED
        const y = height * (0.3 + random() * 0.3)
        const slope = height * (random() - 0.5) * 0.25
        const way = wayAcross(random, 0, width)
        const shadows = pictures.map((sprite, beat) => follow({
            system: alpha, sprite, size, mirrored: way.reversed, color: 0x000000, opacity: 0.32, duration,
            path: (progress, age) => Math.floor(age / BEAT) % 2 === beat
                ? { x: way.x(length * progress - size / 2), y: y + slope * progress }
                : OFFSTAGE,
        }))
        const wind = windOf(way.reversed)
        return together([...shadows, after(duration / 2, () => wind.create(context))])
    },
}

/** A dragon passes overhead: only its shadow and its wind are seen. */
export const DRAGON_SHADOW = sceneEffect({
    id: "dragon-shadow", category: "surprise", floors: DRAGON_FLOORS, weight: 1, spacing: 40, scene: SCENE,
})
