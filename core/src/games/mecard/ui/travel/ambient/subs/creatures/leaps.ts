import { visual } from "../../../../../sim/base/Visual"
import type { AmbientEffect } from "../../AmbientEffect"
import type { Jet } from "../../scene/Jet"
import { sceneEffect } from "../../scene/sceneEffect"
import { atPlace, band } from "../../scene/Spot"
import { leap } from "../../scene/subs/leap"
import { HARBOR_FLOORS, MARSH_FLOORS } from "../../themes"
import { fightsWhere } from "../../trip/places"

/** Water splashing. */
const WATER_SPLASH: readonly Jet[] = [
    {
        count: 8, look: { from: 0xffffff, to: 0x7ac0f0, size: 2, life: 0.6, lifeSpread: 0.25 },
        spread: { speed: 60, speedSpread: 0.45, gravity: 220, angle: [-2.5, -0.65] },
    },
]

/** Mud splashing. */
const MUD_SPLASH: readonly Jet[] = [
    {
        count: 5, look: { from: 0x8aaf5a, to: 0x4a6a3a, size: 2, life: 0.45 },
        spread: { speed: 40, gravity: 220, angle: [-2.7, -0.45] },
    },
]

/** Fish jump out of the water of the harbor. */
const LEAPING_FISH = sceneEffect({
    id: "leaping-fish", category: "signature", floors: HARBOR_FLOORS, weight: 3,
    scene: leap({
        grain: { sprite: visual("ambient/fish"), colors: [0xffffff], size: [9, 11] },
        spot: band(0.8, 0.92), height: [18, 32], span: [20, 34], times: [1, 3], duration: 1.1, gap: 0.8,
        splash: WATER_SPLASH, dive: 1.8,
    }),
})

/** A toad hops about beside a fight. */
const LEAPING_FROGS = sceneEffect({
    id: "leaping-frogs", category: "signature", floors: MARSH_FLOORS, weight: 2,
    scene: leap({
        grain: { sprite: visual("units/frog"), colors: [0xffffff], size: [9, 9] },
        spot: atPlace(fightsWhere(), { x: 16, y: 10, eitherSide: true }), height: [8, 14], span: [12, 18],
        times: [2, 4], duration: 0.6, gap: 0.9, splash: MUD_SPLASH, chained: true,
    }),
})

/** The beings that bound out of the water or the ground. */
export const LEAP_EFFECTS: readonly AmbientEffect[] = [LEAPING_FISH, LEAPING_FROGS]
