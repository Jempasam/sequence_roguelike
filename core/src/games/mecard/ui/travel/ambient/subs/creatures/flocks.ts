import { visual } from "../../../../../sim/base/Visual"
import type { AmbientEffect } from "../../AmbientEffect"
import { sceneEffect } from "../../scene/sceneEffect"
import { flock } from "../../scene/subs/flock"
import { BAT_CLOUD_FLOORS, CROW_FLOORS, HARBOR_FLOORS, SNOW_FLOORS } from "../../themes"

/** A flock of birds crosses the map from left to right, in a V. */
const BIRD_FLOCK = sceneEffect({
    id: "bird-flock", category: "surprise", outdoors: true, weight: 2, spacing: 30,
    scene: flock({
        grain: { sprite: visual("ambient/bird"), colors: [0xffffff], size: [7, 7], opacity: 0.85 },
        count: [5, 7], formation: "v", band: [0.05, 0.5], duration: 9, bob: 1,
    }),
})

/** Seagulls wheel high over the harbor. */
const SEAGULLS = sceneEffect({
    id: "seagulls", category: "signature", floors: HARBOR_FLOORS, outdoors: true, weight: 4,
    scene: flock({
        grain: { sprite: visual("ambient/seagull"), colors: [0xffffff], size: [9, 11] },
        count: [3, 5], formation: "loose", band: [0.08, 0.35], duration: 12, bob: 4,
    }),
})

/** Crows fly by, scattered. */
const CROWS = sceneEffect({
    id: "crows", category: "signature", floors: CROW_FLOORS, outdoors: true, weight: 3,
    scene: flock({
        grain: { sprite: visual("ambient/crow"), colors: [0xffffff], size: [9, 9] },
        count: [3, 6], formation: "loose", band: [0.08, 0.4], duration: 9, bob: 3,
    }),
})

/** A cloud of bats streams across the map. */
const BAT_CLOUD = sceneEffect({
    id: "bat-cloud", category: "signature", floors: BAT_CLOUD_FLOORS, weight: 3,
    scene: flock({
        grain: { sprite: visual("ambient/bat"), colors: [0xffffff], size: [6, 9] },
        count: [9, 14], formation: "loose", band: [0.15, 0.55], duration: 7, bob: 9,
    }),
})

/** A great V of geese goes by. */
const SNOW_GEESE = sceneEffect({
    id: "snow-geese", category: "signature", floors: SNOW_FLOORS, outdoors: true, weight: 3,
    scene: flock({
        grain: { sprite: visual("ambient/goose"), colors: [0xffffff], size: [10, 10] },
        count: [7, 9], formation: "v", band: [0.15, 0.35], duration: 12, bob: 1,
    }),
})

/** The beings that cross the sky together. */
export const FLOCK_EFFECTS: readonly AmbientEffect[] = [BIRD_FLOCK, SEAGULLS, CROWS, BAT_CLOUD, SNOW_GEESE]
