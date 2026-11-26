import { visual } from "../../../../../sim"
import type { AmbientEffect } from "../../AmbientEffect"
import { sceneEffect } from "../../scene/sceneEffect"
import { swarm } from "../../scene/subs/swarm"
import { BAT_FLOORS, BUTTERFLY_FLOORS, ROT_FLOORS } from "../../themes"
import { everywhere, fightsWhere } from "../../trip/places"

/** A few bats flutter around a fight. */
const BATS = sceneEffect({
    id: "bats", floors: BAT_FLOORS, weight: 3,
    scene: swarm({
        around: fightsWhere(), grain: { sprite: visual("ambient/bat"), colors: [0xffffff], size: [7, 8] },
        count: [2, 3], reach: [14, 28], speed: [2.5, 4], duration: [5, 5], flatten: 0.5, lift: 10, jitter: 2,
    }),
})

/** Fireflies drift around a fight and go out. */
const FIREFLIES = sceneEffect({
    id: "fireflies", weight: 2,
    scene: swarm({
        around: fightsWhere(), grain: { colors: [0xe8ff7a], size: [3, 3], glow: true },
        count: [4, 6], reach: [10, 26], speed: [0.9, 0.9], duration: [6, 8], flatten: 0.6, lift: 8,
        weave: 1.45, climb: 2,
    }),
})

/** Butterflies flutter around a place. */
const BUTTERFLIES = sceneEffect({
    id: "butterflies", floors: BUTTERFLY_FLOORS, weight: 3,
    scene: swarm({
        around: everywhere,
        grain: { sprite: visual("ambient/butterfly"), colors: [0xffd34d, 0xff8ad0, 0x8ad0ff, 0xffffff], size: [7, 7] },
        count: [2, 4], reach: [14, 30], speed: [0.8, 1.6], duration: [7, 9], flatten: 0.6, lift: 10,
        jitter: 3,
    }),
})

/** Nervous flies buzz over a fight. */
const FLIES = sceneEffect({
    id: "flies", floors: ROT_FLOORS, weight: 2,
    scene: swarm({
        around: fightsWhere(), grain: { colors: [0x14140e], size: [2, 2] },
        count: [5, 8], reach: [5, 13], speed: [5, 8], duration: [5, 7], flatten: 0.7, lift: 10, jitter: 2,
    }),
})

/** Will-o'-the-wisps turn around a place and go up. */
const WISPS = sceneEffect({
    id: "wisps", floors: ROT_FLOORS, weight: 3,
    scene: swarm({
        around: everywhere, grain: { colors: [0x6affd0, 0x6ac8ff], size: [3, 5], glow: true },
        count: [2, 3], reach: [8, 18], speed: [0.8, 1.4], duration: [6, 8], flatten: 0.5, lift: 6, climb: 5,
    }),
})

/** The small beings that turn around a place. */
export const SWARM_EFFECTS: readonly AmbientEffect[] = [BATS, FIREFLIES, BUTTERFLIES, FLIES, WISPS]
