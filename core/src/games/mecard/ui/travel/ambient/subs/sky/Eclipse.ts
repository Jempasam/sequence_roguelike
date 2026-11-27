import { together } from "../../../../../../../engine/animation"
import type { Point } from "../../../../../../../engine/math"
import { follow, Rate } from "../../../../../../../engine/particles"
import { visual } from "../../../../../sim/base/Visual"
import { ring } from "../../../../particles/recipes"
import type { Scene } from "../../scene/Scene"
import { sceneEffect } from "../../scene/sceneEffect"

/** The dark body that hides the sun. */
const DISC = visual("ambient/disc")

/** The soft light around it. */
const HALO = visual("ambient/halo")

/** How long it lasts, in seconds. */
const DURATION = 6

/** The opacity of the veil that darkens the space. */
const VEIL = 0.35

/** The most the picture of the disc is wide, in pixels, and the most as a share of the width. */
const SIZE = 34
const SHARE = 0.14

/** The share of the width of its picture the disc covers on each side of its middle. */
const RADIUS = 0.45

/** The space darkens while a black disc ringed with light slides by at the top. */
const SCENE: Scene = {
    playable: () => true,
    create(context){
        const disc = context.sprite(DISC)
        const halo = context.sprite(HALO)
        if(!disc || !halo) return null
        const { alpha, additive, random } = context
        const { width, height } = context.size()
        const size = Math.min(SIZE, width * SHARE)
        const path = (progress: number): Point => {
            return { x: width * (0.38 + 0.24 * progress), y: height * 0.18 }
        }
        const corona = new Rate()
        return together([
            follow({
                system: alpha, size: Math.max(width, height) * 1.5, color: 0x000000, opacity: VEIL,
                duration: DURATION, path: () => ({ x: width / 2, y: height / 2 }),
            }),
            follow({
                system: alpha, sprite: halo, size: size * 2.4, color: 0xffd890, duration: DURATION, path,
            }),
            follow({
                system: alpha, sprite: disc, size, color: 0x08060c, duration: DURATION, path,
                step: (at, dt) => {
                    for(let n = corona.take(14, dt); n > 0; n--){
                        ring(additive, random, at, 6, size * (RADIUS + 0.06), {
                            from: 0xfff0c0, to: 0xff8a2a, size: 2, end: 0, life: 0.4, lifeSpread: 0.4,
                        }, 6)
                    }
                },
            }),
        ])
    },
}

/** An eclipse darkens the sky for a moment. */
export const ECLIPSE = sceneEffect({
    id: "eclipse", category: "weather", outdoors: true, weight: 0.05, spacing: 90, scene: SCENE,
})
