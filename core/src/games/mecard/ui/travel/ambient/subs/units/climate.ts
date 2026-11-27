import { visual } from "../../../../../sim/base/Visual"
import type { AmbientEffect } from "../../AmbientEffect"
import { sceneEffect } from "../../scene/sceneEffect"
import { RAIN_FLOORS, ROCK_FLOORS, SNOW_FLOORS } from "../../themes"
import { bodies } from "../../unit/selection"
import { aura } from "../../unit/subs/aura"
import { cap } from "../../unit/subs/cap"
import { companion } from "../../unit/subs/companion"

/** Each unit breathes out a little cloud of vapor in the cold. */
const COLD_BREATH = sceneEffect({
    id: "cold-breath", category: "unit", floors: SNOW_FLOORS, weight: 3,
    scene: aura({
        among: bodies, duration: 6, staggered: true,
        emissions: [{
            anchor: "mouth", interval: 1.6, count: [3, 4], life: 0.9,
            grain: { colors: [0xeaf6ff, 0xcfe6ff], size: [2, 3], opacity: 0.6 },
            forward: [10, 18], vy: [-6, -1], drag: 2, grows: 5,
        }],
    }),
})

/** Snow heaps on the head of a unit that stays still, and falls off when it moves. */
const SNOW_CAP = sceneEffect({
    id: "snow-cap", category: "unit", floors: SNOW_FLOORS, outdoors: true, weight: 3,
    scene: cap({
        among: bodies, grain: { colors: [0xffffff, 0xdfefff], size: [2, 3] }, gathering: 5, duration: 8,
    }),
})

/** Drops of rain burst on the heads. */
const RAIN_SPLASHES = sceneEffect({
    id: "rain-splashes", category: "unit", floors: RAIN_FLOORS, outdoors: true, weight: 3,
    scene: aura({
        among: bodies, duration: 6, staggered: true,
        emissions: [{
            anchor: "head", interval: 0.33, count: [2, 3], life: 0.25,
            grain: { colors: [0x9ac8ff, 0xc8e0ff], size: [1, 2] },
            vx: [-18, 18], vy: [-30, -12], ay: [140, 140], scatter: { x: 5, y: 1 },
        }],
    }),
})

/** A warm and flickering halo follows each unit underground, as the lamp of a miner would. */
const HEAD_LAMP = sceneEffect({
    id: "head-lamp", category: "unit", floors: ROCK_FLOORS, weight: 3,
    scene: companion({
        among: bodies, anchor: "middle", duration: 8, fade: 1, flicker: 0.25,
        grain: {
            sprite: visual("ambient/halo"), colors: [0xffb347], size: [30, 30], opacity: 0.25, glow: true,
        },
    }),
})

/** What the climate of a floor does to the units. */
export const UNIT_CLIMATE_EFFECTS: readonly AmbientEffect[] = [
    COLD_BREATH, SNOW_CAP, RAIN_SPLASHES, HEAD_LAMP,
]
