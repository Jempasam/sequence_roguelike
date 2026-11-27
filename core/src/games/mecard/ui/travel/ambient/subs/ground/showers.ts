import { visual } from "../../../../../sim/base/Visual"
import type { AmbientEffect } from "../../AmbientEffect"
import type { Jet } from "../../scene/Jet"
import { sceneEffect } from "../../scene/sceneEffect"
import { atPlace, band, curtains, fixed } from "../../scene/Spot"
import { drift } from "../../scene/subs/drift"
import { layered } from "../../scene/subs/layered"
import { fromBeside, fromSky, shower } from "../../scene/subs/shower"
import { FIREWORK_FLOORS, HAIL_FLOORS, LAVA_FLOORS, MARSH_FLOORS, ROCK_FLOORS } from "../../themes"
import { allHaltPlaces } from "../../trip/places"

/** The directions that go up from the ground, in radians. */
const UPWARD = [-Math.PI, 0] as const

// SPLASHES //

/** Chips of ice thrown where a hailstone hits the ground. */
const ICE_CHIPS: Jet = {
    count: 3, look: { from: 0xffffff, size: 1, life: 0.25 },
    spread: { speed: 30, angle: UPWARD, gravity: 120 },
}

/** The sparks and the smoke thrown where a burning drop hits the ground. */
const FIRE_SPLASH: readonly Jet[] = [
    {
        count: 7, glow: true, look: { from: 0xffe08a, to: 0xff3a1a, size: 2, end: 0, life: 0.4 },
        spread: { speed: 45, angle: UPWARD, gravity: 130 },
    },
    {
        count: 2, look: { from: 0x5a4a4a, size: 3, end: 7, life: 0.6 },
        spread: { speed: 10, angle: UPWARD },
    },
]

/** The dust raised by a rock that falls from the vault. */
const ROCK_PUFF: Jet = {
    count: 8, look: { from: 0xb0a088, to: 0x6a604e, size: 3, end: 7, life: 0.6 },
    spread: { speed: 24, angle: UPWARD, drag: 1 },
}

/** The flash, the sparks and the rubble of a meteorite that hits the ground. */
const IMPACT: readonly Jet[] = [
    { count: 1, glow: true, look: { from: 0xffc070, size: 90, end: 120, life: 0.25 }, spread: { speed: 0 } },
    {
        count: 30, glow: true, look: { from: 0xffe08a, to: 0xff3a1a, size: 3, end: 0, life: 0.7 },
        spread: { speed: 75, speedSpread: 0.6, gravity: 70 },
    },
    {
        count: 14, look: { from: 0x4a3a30, size: 3, life: 5 },
        spread: { speed: 45, speedSpread: 0.8, drag: 6 },
    },
]

/** The burst of a rocket of one color: a flash, then a ball of sparks that sags. */
function bouquet(color: number): readonly Jet[] {
    return [
        { count: 1, glow: true, look: { from: color, size: 22, end: 34, life: 0.18 }, spread: { speed: 0 } },
        {
            count: 34, glow: true, look: { from: 0xffffff, to: color, size: 3, end: 1, life: 0.9 },
            spread: { speed: 55, speedSpread: 0.25, drag: 1.8, gravity: 28 },
        },
    ]
}

// EFFECTS //

/** Hail drives down at a slant, hits the ground and bounces. */
const HAIL = sceneEffect({
    id: "hail", category: "weather", floors: HAIL_FLOORS, outdoors: true, weight: 2,
    scene: shower({
        grain: { colors: [0xffffff, 0xd8ecff], size: [2, 3] },
        spot: band(0.15, 1), count: [90, 110], gap: 0.045, from: fromSky([0.2, 0.3]), speed: [260, 340],
        splashes: [[ICE_CHIPS]], bounce: { height: [5, 10], span: [3, 9], duration: 0.3 },
    }),
})

/** Large bubbles rise swaying from the marsh, then pop. */
const GIANT_BUBBLES = sceneEffect({
    id: "giant-bubbles", category: "weather", floors: MARSH_FLOORS, outdoors: true, weight: 1, spacing: 40,
    scene: shower({
        grain: {
            sprite: visual("ambient/bubble"), colors: [0x9adf6a, 0x8adfd0, 0xc8f0ff], size: [9, 16],
            opacity: 0.75,
        },
        spot: band(0.15, 0.65), count: [10, 14], gap: 0.35, from: fromBeside([-20, 20], [60, 110]),
        speed: [30, 45], sway: 6,
        splashes: [[{ count: 7, look: { from: 0xd8fff0, size: 1, life: 0.3 }, spread: { speed: 28 } }]],
    }),
})

/** Burning drops fall from the sky, trailing fire, and burst into sparks. */
const FIRE_RAIN = sceneEffect({
    id: "fire-rain", category: "weather", floors: LAVA_FLOORS, outdoors: true, weight: 2,
    scene: shower({
        grain: {
            sprite: visual("ambient/streak"), colors: [0xffb04a, 0xff6a2a, 0xffe08a], size: [10, 16],
            glow: true,
        },
        spot: band(0.2, 1), count: [28, 36], gap: 0.14, from: fromSky([0.15, 0.35]), speed: [170, 230],
        turned: true,
        trail: {
            rate: 14,
            jet: {
                count: 1, glow: true, look: { from: 0xff8a2a, to: 0x8a1a0a, size: 2, end: 0, life: 0.35 },
                spread: { speed: 8 },
            },
        },
        splashes: [FIRE_SPLASH],
    }),
})

/** The vault shakes: sheets of dust pour from it and rocks fall, raising clouds. */
const CAVE_TREMOR = sceneEffect({
    id: "cave-tremor", category: "weather", floors: ROCK_FLOORS, weight: 2, spacing: 40,
    scene: layered(
        drift({
            spot: curtains(3, 18), duration: 3.5, swell: 0.6,
            layers: [{
                grain: { colors: [0x9a8a70, 0x7a6e5c, 0xb0a088], size: [1, 3], opacity: 0.8 },
                rate: 70, life: 2.2, vx: [-6, 6], vy: [50, 100], ay: [40, 80], fades: true,
            }],
        }),
        shower({
            grain: { sprite: visual("ambient/rock"), colors: [0xffffff], size: [4, 8] },
            spot: band(0.55, 1), count: [10, 14], gap: 0.25, from: fromSky([0, 0]), speed: [150, 220],
            splashes: [[ROCK_PUFF]], bounce: { height: [6, 12], span: [-8, 8], duration: 0.35 },
        }),
    ),
})

/** A meteorite falls beside a place, bursts, and leaves a smoking crater. */
const METEORITE = sceneEffect({
    id: "meteorite", category: "surprise", outdoors: true, weight: 0.5, spacing: 90,
    scene: shower({
        grain: { sprite: visual("ambient/rock"), colors: [0xffa860], size: [12, 12] },
        spot: atPlace(context => context.places(), { x: 22, y: 8, eitherSide: true }),
        count: [1, 1], gap: 0, from: fromSky([0.5, 0.8]), speed: [150, 150],
        trail: {
            rate: 60,
            jet: {
                count: 1, glow: true, look: { from: 0xffe08a, to: 0xc02a0a, size: 8, end: 1, life: 0.5 },
                spread: { speed: 10 },
            },
        },
        splashes: [IMPACT],
        remains: at => drift({
            spot: fixed(at), duration: 3.5, swell: 0.8,
            layers: [
                {
                    grain: { colors: [0x6a626a, 0x4a444a], size: [3, 4], opacity: 0.7 },
                    rate: 9, life: 2.2, lifeSpread: 0.25, vx: [-5, 9], vy: [-30, -16],
                    scatter: { x: 5, y: 2 }, grows: 11, fades: true,
                },
                {
                    grain: { colors: [0xff8a2a], size: [2, 3], glow: true },
                    rate: 14, life: 0.7, vx: [-6, 6], vy: [-14, -2], scatter: { x: 8, y: 3 }, turns: 0x8a1a0a,
                    fades: true,
                },
            ],
        }),
    }),
})

/** Rockets go up from a halt and burst into colors. */
const FIREWORKS = sceneEffect({
    id: "fireworks", category: "surprise", floors: FIREWORK_FLOORS, outdoors: true, weight: 1, spacing: 40,
    scene: shower({
        grain: { colors: [0xfff0c0], size: [2, 2], glow: true },
        spot: atPlace(allHaltPlaces, { y: -55 }), scatter: { x: 45, y: 22 }, count: [4, 6], gap: 0.55,
        from: fromBeside([0, 0], [55, 55]), speed: [75, 95],
        trail: {
            rate: 30,
            jet: {
                count: 1, glow: true, look: { from: 0xffd34d, to: 0x8a4a0a, size: 2, end: 0, life: 0.35 },
                spread: { speed: 6 },
            },
        },
        splashes: [0xff5a5a, 0x5ad0ff, 0xffd34d, 0x8aff7a, 0xd08aff].map(bouquet),
    }),
})

/** What sets off one after another and bursts where it arrives. */
export const SHOWER_EFFECTS: readonly AmbientEffect[] = [
    HAIL, GIANT_BUBBLES, FIRE_RAIN, CAVE_TREMOR, METEORITE, FIREWORKS,
]
