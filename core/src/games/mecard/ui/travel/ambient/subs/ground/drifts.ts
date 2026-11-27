import { visual } from "../../../../../sim/base/Visual"
import type { AmbientEffect } from "../../AmbientEffect"
import type { Grain } from "../../scene/Grain"
import { sceneEffect } from "../../scene/sceneEffect"
import { atPlace, band, screen, sideEdge, topEdge } from "../../scene/Spot"
import { drift } from "../../scene/subs/drift"
import {
    ASH_FLOORS, CAVE_FLOORS, EMBER_FLOORS, FACTORY_FLOORS, LANTERN_FLOORS, LEAF_FLOORS, MARSH_FLOORS,
    PETAL_FLOORS, RAIN_FLOORS, REST_HALTS, ROCK_FLOORS, SNOW_FLOORS, WOOD_FLOORS,
} from "../../themes"
import { allHaltPlaces, fightsWhere, haltsAmong } from "../../trip/places"

// GRAINS //

/** A flake of snow. */
const FLAKE: Grain = { sprite: visual("ambient/snowflake"), colors: [0xffffff], size: [3, 5], opacity: 0.9 }

/** A streak turned along its motion: a drop of water, a trail of snow. */
const STREAK = visual("ambient/streak")


// EFFECTS //

/** Leaves drift across the map in the wind. */
const LEAVES = sceneEffect({
    id: "leaves", category: "backdrop", floors: LEAF_FLOORS, outdoors: true, weight: 4,
    scene: drift({
        spot: sideEdge(0, 0.5), duration: 5,
        layers: [{
            grain: { colors: [0xcc8c33, 0xcc8c33, 0x73bf33, 0x73bf33, 0x73bf33], size: [3, 3], opacity: 0.9 },
            rate: 4, life: 11, cross: [6.9, 11.2], vy: [14, 26], ay: [-6, 6], spin: [-4, 4],
        }],
    }),
})

/** Cherry petals fall slowly over the map, swaying as they drift. */
const CHERRY_PETALS = sceneEffect({
    id: "cherry-petals", category: "backdrop", floors: PETAL_FLOORS, outdoors: true, weight: 4,
    scene: drift({
        spot: topEdge(), duration: 7,
        layers: [{
            grain: { colors: [0xffc7d4, 0xffd6e3, 0xffe8f4, 0xfff5ff], size: [2, 4], opacity: 0.9 },
            rate: 9, life: 12, vx: [8, 22], vy: [14, 24], ax: [-8, 8], drag: 0.2, spin: [-3, 3],
        }],
    }),
})

/** Embers rise from a fight. */
const EMBERS = sceneEffect({
    id: "embers", category: "signature", floors: EMBER_FLOORS, weight: 4,
    scene: drift({
        spot: atPlace(fightsWhere()), duration: 4,
        layers: [{
            grain: { colors: [0xffb04a], size: [2, 2], glow: true },
            rate: 7, life: 1.8, vx: [-10, 10], vy: [-31, -13], scatter: { x: 8, y: 0 }, turns: 0xff3a1a,
            fades: true,
        }],
    }),
})

/** A campfire burns beside a place of rest, its smoke rising. */
const CAMPFIRE = sceneEffect({
    id: "campfire", category: "surprise", weight: 3,
    scene: drift({
        spot: atPlace(haltsAmong(REST_HALTS), { x: 14, y: 6 }), duration: 8, swell: 1,
        layers: [
            {
                grain: { colors: [0xffd34d], size: [3, 3], glow: true },
                rate: 14, life: 0.6, lifeSpread: 0.3, vx: [-10, 10], vy: [-34, -14], scatter: { x: 3, y: 0 },
                grows: 0, turns: 0xff4a1a, fades: true,
            },
            {
                grain: { colors: [0x8a8a94], size: [3, 3] },
                rate: 4, life: 2.4, lifeSpread: 0.25, vx: [-10, 10], vy: [-25, -11], scatter: { x: 2, y: 0 },
                offset: { x: 0, y: -5 }, grows: 11, turns: 0x5a5a66, fades: true,
            },
            {
                grain: { colors: [0xffe08a], size: [2, 2], glow: true },
                rate: 2, life: 0.8, vx: [-26, 26], vy: [-34, -22], turns: 0xff7a2a, fades: true,
            },
        ],
    }),
})

/** A gust of wind: long pale streaks cross the map at a slant, carrying dust and a few leaves. */
const GUST = sceneEffect({
    id: "gust", category: "weather", outdoors: true, weight: 2,
    scene: drift({
        spot: sideEdge(), duration: 2.4, mirrored: true,
        layers: [
            {
                grain: { colors: [0xe6f2ff], size: [10, 18], opacity: 0.22, glow: true },
                rate: 8, life: 3, cross: [1.9, 2.8], vy: [9, 23], grows: 4, fades: true, stretched: true,
            },
            {
                grain: { colors: [0x8cb340], size: [3, 3], opacity: 0.9 },
                rate: 2, life: 3.5, cross: [2.5, 4.2], vy: [15, 15], ay: [-40, 40], spin: [-8, 8],
                fades: true,
            },
            {
                grain: { colors: [0xb8a88a], size: [2, 2], opacity: 0.7 },
                rate: 5, life: 3.5, cross: [2.5, 4.2], vy: [15, 15], ay: [-40, 40], spin: [-8, 8],
                fades: true,
            },
        ],
    }),
})

/** Snow falls slowly over the map, swaying. */
const SNOWFALL = sceneEffect({
    id: "snowfall", category: "backdrop", floors: SNOW_FLOORS, outdoors: true, weight: 5,
    scene: drift({
        spot: topEdge(), duration: 8,
        layers: [{
            grain: FLAKE, rate: 12, life: 14, vx: [-10, 10], vy: [16, 28], ax: [-2, 2], spin: [-1, 1],
        }],
    }),
})

/** A blizzard sweeps the map: snow blown flat, with pale trails. */
const BLIZZARD = sceneEffect({
    id: "blizzard", category: "weather", floors: SNOW_FLOORS, outdoors: true, weight: 2,
    scene: drift({
        spot: sideEdge(-0.2, 1), duration: 4, mirrored: true, swell: 1,
        layers: [
            { grain: FLAKE, rate: 34, life: 2.4, cross: [1.1, 2], vy: [20, 50], spin: [-4, 4] },
            {
                grain: { sprite: STREAK, colors: [0xffffff], size: [14, 24], opacity: 0.35 },
                rate: 10, life: 1.8, cross: [0.8, 1.2], vy: [20, 40], stretched: true,
            },
        ],
    }),
})

/** Sparks of frost twinkle here and there. */
const ICE_GLITTER = sceneEffect({
    id: "ice-glitter", category: "backdrop", floors: SNOW_FLOORS, weight: 3,
    scene: drift({
        spot: screen(), duration: 6, swell: 1,
        layers: [{
            grain: { colors: [0xffffff, 0xbfe8ff], size: [2, 4], glow: true },
            rate: 9, life: 0.5, lifeSpread: 0.3, grows: 0, fades: true,
        }],
    }),
})

/** Drops of water fall from the vault. */
const CAVE_DRIPS = sceneEffect({
    id: "cave-drips", category: "backdrop", floors: CAVE_FLOORS, weight: 4,
    scene: drift({
        spot: topEdge(), duration: 6,
        layers: [{
            grain: { sprite: STREAK, colors: [0x6aa8e0, 0x9ad0f0], size: [5, 7], opacity: 0.85 },
            rate: 4, life: 3, vy: [60, 100], ay: [150, 200], stretched: true,
        }],
    }),
})

/** Dust trickles down from the rock. */
const ROCK_DUST = sceneEffect({
    id: "rock-dust", category: "backdrop", floors: ROCK_FLOORS, weight: 3,
    scene: drift({
        spot: topEdge(), duration: 6, swell: 1,
        layers: [{
            grain: { colors: [0x9a8a70, 0x7a6e5c, 0xb0a088], size: [1, 2], opacity: 0.8 },
            rate: 14, life: 5, vx: [-4, 4], vy: [20, 40], ay: [4, 12], fades: true,
        }],
    }),
})

/** A slanting shower falls on the map. */
const RAIN = sceneEffect({
    id: "rain", category: "weather", floors: RAIN_FLOORS, outdoors: true, weight: 3,
    scene: drift({
        spot: topEdge(), duration: 6, swell: 1.5,
        layers: [{
            grain: { sprite: STREAK, colors: [0x9ac0e8], size: [5, 9], opacity: 0.6 },
            rate: 60, life: 1.8, vx: [35, 55], vy: [200, 270], stretched: true,
        }],
    }),
})

/** Grey ash falls, a few flakes still glowing. */
const ASH_FALL = sceneEffect({
    id: "ash-fall", category: "backdrop", floors: ASH_FLOORS, outdoors: true, weight: 4,
    scene: drift({
        spot: topEdge(), duration: 9,
        layers: [
            {
                grain: { colors: [0x8a8488, 0x5e585e, 0xaaa4a6], size: [1, 3], opacity: 0.8 },
                rate: 11, life: 14, vx: [-8, 8], vy: [14, 26], ax: [-2, 2], spin: [-2, 2],
            },
            {
                grain: { colors: [0xff7a2a, 0xffb04a], size: [1, 2], glow: true },
                rate: 2, life: 7, vx: [-10, 10], vy: [18, 30], turns: 0x8a1a0a, fades: true,
            },
        ],
    }),
})

/** Green bubbles rise from the water, swell and pop. */
const MARSH_BUBBLES = sceneEffect({
    id: "marsh-bubbles", category: "backdrop", floors: MARSH_FLOORS, weight: 4,
    scene: drift({
        spot: band(0.7, 0.95), duration: 7,
        layers: [{
            grain: { sprite: visual("ambient/bubble"), colors: [0x9adf6a, 0x6abf7a], size: [2, 3], opacity: 0.8 },
            rate: 5, life: 1.6, lifeSpread: 0.4, vx: [-3, 3], vy: [-14, -5], grows: 6,
        }],
    }),
})

/** Golden grains float in the air of the woods. */
const POLLEN = sceneEffect({
    id: "pollen", category: "backdrop", floors: WOOD_FLOORS, outdoors: true, weight: 3,
    scene: drift({
        spot: screen(), duration: 8, swell: 2,
        layers: [{
            grain: { colors: [0xffe08a, 0xd8f08a], size: [1, 2], glow: true },
            rate: 8, life: 5, lifeSpread: 0.3, vx: [-6, 8], vy: [-6, 4], ax: [-2, 2], fades: true,
        }],
    }),
})

/** Paper lanterns rise from a halt into the sky. */
const SKY_LANTERNS = sceneEffect({
    id: "sky-lanterns", category: "signature", floors: LANTERN_FLOORS, outdoors: true, weight: 3,
    scene: drift({
        spot: atPlace(allHaltPlaces, { y: -8 }), duration: 8,
        layers: [{
            grain: { sprite: visual("ambient/lantern"), colors: [0xffffff], size: [6, 8] },
            rate: 0.8, life: 8, vx: [-3, 6], vy: [-22, -14], ax: [-1, 1], scatter: { x: 14, y: 4 },
        }],
    }),
})

/** Smoke pours out above a fight. */
const CHIMNEY_SMOKE = sceneEffect({
    id: "chimney-smoke", category: "signature", floors: FACTORY_FLOORS, weight: 4,
    scene: drift({
        spot: atPlace(fightsWhere(), { x: 10, y: -8, eitherSide: true }), duration: 8, swell: 1.5,
        layers: [{
            grain: { colors: [0x7a767e, 0x55515a, 0x908c92], size: [3, 4], opacity: 0.6 },
            rate: 7, life: 3, lifeSpread: 0.25, vx: [2, 12], vy: [-30, -18], scatter: { x: 2, y: 0 },
            grows: 13, fades: true,
        }],
    }),
})

/** Black soot falls back from the chimneys. */
const SOOT = sceneEffect({
    id: "soot", category: "backdrop", floors: FACTORY_FLOORS, outdoors: true, weight: 2,
    scene: drift({
        spot: topEdge(), duration: 6,
        layers: [{
            grain: { colors: [0x1c1a1e, 0x35323a], size: [1, 2], opacity: 0.85 },
            rate: 8, life: 12, vx: [-6, 14], vy: [18, 30], spin: [-3, 3],
        }],
    }),
})

/** What is born bit by bit and falls, rises or is blown: weather, dust, smoke. */
export const DRIFT_EFFECTS: readonly AmbientEffect[] = [
    LEAVES, CHERRY_PETALS, EMBERS, CAMPFIRE, GUST, SNOWFALL, BLIZZARD, ICE_GLITTER, CAVE_DRIPS, ROCK_DUST,
    RAIN, ASH_FALL, MARSH_BUBBLES, POLLEN, SKY_LANTERNS, CHIMNEY_SMOKE, SOOT,
]
