import { visual } from "../../../../../sim/base/Visual"
import type { AmbientEffect } from "../../AmbientEffect"
import { sceneEffect } from "../../scene/sceneEffect"
import { glide } from "../../scene/subs/glide"
import { FOG_FLOORS, HARBOR_FLOORS, VOLCANO_FLOORS } from "../../themes"

/** The picture of a cloud, with soft edges: tinted by what it stands for. */
const CLOUD = visual("ambient/cloud")

/** The picture of a bank of fog, wide and pale with soft edges. */
const FOG_BANK = visual("ambient/fog")

/** Banks of fog glide along the bottom of the map. */
const FOG = sceneEffect({
    id: "fog", category: "backdrop", floors: FOG_FLOORS, outdoors: true, weight: 4,
    scene: glide({
        grain: { sprite: FOG_BANK, colors: [0xa8b8a8], size: [140, 220], opacity: 0.3 },
        count: 3, gap: 2.5, band: [0.72, 0.92], duration: 14, wave: 6,
    }),
})

/** A wide shadow of a cloud slides over the map. */
const CLOUD_SHADOW = sceneEffect({
    id: "cloud-shadow", category: "weather", outdoors: true, weight: 1,
    scene: glide({
        grain: { sprite: CLOUD, colors: [0x000000], size: [120, 120], opacity: 0.16 },
        count: 1, gap: 0, band: [0.2, 0.8], duration: 16, slope: 30, span: 1 / 3,
    }),
})

/** Dark clouds of the volcano slide high above the map. */
const VOLCANO_SMOKE = sceneEffect({
    id: "volcano-smoke", category: "weather", floors: VOLCANO_FLOORS, outdoors: true, weight: 3,
    scene: glide({
        grain: { sprite: CLOUD, colors: [0x2a1c1c, 0x453030], size: [90, 140], opacity: 0.35 },
        count: 3, gap: 2, band: [0.05, 0.3], duration: 16, slope: 12,
    }),
})

/** White mist rolls over the water of the harbor. */
const SEA_MIST = sceneEffect({
    id: "sea-mist", category: "backdrop", floors: HARBOR_FLOORS, outdoors: true, weight: 4,
    scene: glide({
        grain: { sprite: CLOUD, colors: [0xdce8f0], size: [90, 140], opacity: 0.25 },
        count: 4, gap: 1.5, band: [0.75, 0.9], duration: 14, wave: 4,
    }),
})

/** The wide shapes that slide over the map: fog, shadows, smoke. */
export const GLIDE_EFFECTS: readonly AmbientEffect[] = [FOG, CLOUD_SHADOW, VOLCANO_SMOKE, SEA_MIST]
