import { visual } from "../../../../../sim"
import { SPARK } from "../../../../particles/recipes"
import type { AmbientEffect } from "../../AmbientEffect"
import type { Jet } from "../../scene/Jet"
import { sceneEffect } from "../../scene/sceneEffect"
import { atPlace, band } from "../../scene/Spot"
import { eruption } from "../../scene/subs/eruption"
import {
    BLAST_FLOORS, GRAVE_FLOORS, HARBOR_FLOORS, HELL_FLOORS, LAVA_FLOORS, MARSH_FLOORS, ROCK_FLOORS,
    SNOW_FLOORS, STEAM_FLOORS,
} from "../../themes"
import { fightsWhere, unwonWhere } from "../../trip/places"

// JETS //

const LAVA = { from: 0xffd34d, to: 0xff3a1a, size: 3, end: 2, life: 1.3, lifeSpread: 0.2 }
const SMOKE = { from: 0x4a4650, to: 0x2a2830, size: 4, end: 16, life: 1.8, lifeSpread: 0.25 }

/** Lava thrown up, with its glow and its smoke. */
const LAVA_JETS: readonly Jet[] = [
    {
        count: 14, look: LAVA, spread: { speed: 110, speedSpread: 0.35, angle: [-1.9, -1.24], gravity: 260 },
        glow: true,
    },
    { count: 1, look: { from: 0xff7a2a, size: 14, end: 0, life: 0.5 }, spread: { speed: 0 }, glow: true },
    { count: 4, look: { from: 0x3a2a2a, size: 3, end: 6, life: 0.9 }, spread: { speed: 25 } },
]

/** A fireball, flying debris, smoke. */
const BLAST_JETS: readonly Jet[] = [
    {
        count: 1, look: { from: 0xffffff, to: 0xff7a2a, size: 6, end: 30, life: 0.35 }, spread: { speed: 0 },
        glow: true,
    },
    {
        count: 16, look: { ...SPARK, size: 3, life: 0.7 },
        spread: { speed: 150, speedSpread: 0.5, gravity: 260 }, glow: true,
    },
    {
        count: 8, look: { from: 0xffd34d, to: 0xff3a1a, size: 5, end: 1, life: 0.5 },
        spread: { speed: 70, drag: 2 }, glow: true,
    },
    { count: 10, look: SMOKE, spread: { speed: 40, drag: 1.5, angle: [-Math.PI, 0] } },
    {
        count: 6, look: { from: 0x3a2a2a, size: 2, life: 0.9, fades: false },
        spread: { speed: 120, gravity: 350, speedSpread: 0.5 },
    },
]

/** The dust of rocks hitting the ground, and their splinters. */
const RUBBLE_JETS: readonly Jet[] = [
    {
        count: 12, look: { from: 0x9a8a70, to: 0x6a5e4c, size: 4, end: 12, life: 1.1, lifeSpread: 0.3 },
        spread: { speed: 38, drag: 2, angle: [-Math.PI, 0] },
    },
    {
        count: 8, look: { from: 0x6a625a, size: 2, life: 0.7, fades: false },
        spread: { speed: 80, speedSpread: 0.5, gravity: 320, angle: [-Math.PI, 0] },
    },
]

/** The white cloud of an avalanche. */
const SNOW_JETS: readonly Jet[] = [
    {
        count: 14, look: { from: 0xffffff, to: 0xcfe4f4, size: 5, end: 16, life: 1.3, lifeSpread: 0.3 },
        spread: { speed: 55, drag: 2, angle: [-Math.PI, 0] },
    },
]

/** A hiss of white steam going up. */
const STEAM_JETS: readonly Jet[] = [
    {
        count: 14, look: { from: 0xf0f4f8, to: 0x9aa4ae, size: 3, end: 12, life: 1.1, lifeSpread: 0.35 },
        spread: { speed: 90, speedSpread: 0.5, drag: 2, angle: [-1.75, -1.39] },
    },
]

/** A bubble of the marsh bursting. */
const MARSH_JETS: readonly Jet[] = [
    {
        count: 12, look: { from: 0xaadf6a, to: 0x4a7a3a, size: 2, life: 0.7 },
        spread: { speed: 75, speedSpread: 0.5, gravity: 260, angle: [-2.7, -0.45] },
    },
    {
        count: 5, look: { from: 0x6a8a3a, size: 4, end: 12, life: 1.4 },
        spread: { speed: 18, angle: [-Math.PI, 0] },
    },
]

/** The halo a spectre leaves where it comes out. */
const SOUL_JETS: readonly Jet[] = [
    { count: 1, look: { from: 0x6affd0, size: 8, end: 28, life: 0.9 }, spread: { speed: 0 }, glow: true },
    {
        count: 10, look: { from: 0xbfffe8, to: 0x3a9a8a, size: 2, life: 1.4, lifeSpread: 0.3 },
        spread: { speed: 28, angle: [-2.5, -0.65] }, glow: true,
    },
]

/** A pulse of a column of fire. */
const FIRE_JETS: readonly Jet[] = [
    {
        count: 18, look: { from: 0xffe08a, to: 0xff2a1a, size: 5, end: 1, life: 0.8, lifeSpread: 0.35 },
        spread: { speed: 130, speedSpread: 0.6, angle: [-1.66, -1.48] }, glow: true,
    },
    { count: 1, look: { from: 0xff7a2a, size: 18, end: 0, life: 0.3 }, spread: { speed: 0 }, glow: true },
]

/** A column of foam falling back. */
const FOAM_JETS: readonly Jet[] = [
    {
        count: 22, look: { from: 0xffffff, to: 0x7ac0f0, size: 3, end: 1, life: 1.1, lifeSpread: 0.25 },
        spread: { speed: 120, speedSpread: 0.45, gravity: 240, angle: [-1.85, -1.29] },
    },
    { count: 8, look: { from: 0xdff4ff, size: 2, life: 0.7 }, spread: { speed: 45, angle: [-Math.PI, 0] } },
]


// EFFECTS //

/** Lava jets out of the ground by a fight, three times, and falls back. */
const LAVA_GEYSER = sceneEffect({
    id: "lava-geyser", floors: LAVA_FLOORS, weight: 4,
    scene: eruption({
        spot: atPlace(fightsWhere(), { x: 14, y: 6, eitherSide: true }), jets: LAVA_JETS, times: 3, gap: 0.7,
    }),
})

/** A fight not yet won blows up: a fireball, flying debris, smoke. */
const EXPLOSION = sceneEffect({
    id: "explosion", floors: BLAST_FLOORS, weight: 2, spacing: 25,
    scene: eruption({ spot: atPlace(unwonWhere(fightsWhere())), jets: BLAST_JETS }),
})

/** Rocks fall beside a fight and raise dust. */
const ROCKFALL = sceneEffect({
    id: "rockfall", floors: ROCK_FLOORS, weight: 3, spacing: 25,
    scene: eruption({
        spot: atPlace(fightsWhere(), { x: 18, y: 8, eitherSide: true }), jets: RUBBLE_JETS,
        drop: {
            grain: { sprite: visual("ambient/rock"), colors: [0xffffff], size: [5, 9] },
            count: 4, spread: 12, height: 90, time: 0.8,
        },
    }),
})

/** Snow slides down in three waves and bursts into a white cloud. */
const AVALANCHE = sceneEffect({
    id: "avalanche", floors: SNOW_FLOORS, weight: 3, spacing: 30,
    scene: eruption({
        spot: band(0.55, 0.85), jets: SNOW_JETS, times: 3, gap: 0.6,
        drop: {
            grain: { sprite: visual("ambient/snowflake"), colors: [0xffffff], size: [4, 8] },
            count: 24, spread: 32, height: 80, time: 0.9,
        },
    }),
})

/** Steam hisses out of the ground beside a fight. */
const STEAM_VENT = sceneEffect({
    id: "steam-vent", floors: STEAM_FLOORS, weight: 3,
    scene: eruption({
        spot: atPlace(fightsWhere(), { x: 16, y: 8, eitherSide: true }), jets: STEAM_JETS, times: 3, gap: 0.8,
    }),
})

/** A fat bubble swells out of the marsh and bursts. */
const MARSH_BURST = sceneEffect({
    id: "marsh-burst", floors: MARSH_FLOORS, weight: 3,
    scene: eruption({
        spot: band(0.7, 0.92), jets: MARSH_JETS,
        drop: {
            grain: { sprite: visual("ambient/bubble"), colors: [0x9adf6a], size: [12, 15], opacity: 0.85 },
            count: 1, spread: 0, height: -8, time: 1.4,
        },
    }),
})

/** A spectre rises out of a fight in a pale halo. */
const SPECTRE_RISE = sceneEffect({
    id: "spectre-rise", floors: GRAVE_FLOORS, weight: 3, spacing: 25,
    scene: eruption({
        spot: atPlace(fightsWhere()), jets: SOUL_JETS,
        drop: {
            grain: { sprite: visual("units/ghost"), colors: [0x9affe0], size: [14, 14], opacity: 0.7, glow: true },
            count: 1, spread: 0, height: 44, time: 2.8, rising: true,
        },
    }),
})

/** A column of fire pulses beside a fight. */
const FLAME_PILLAR = sceneEffect({
    id: "flame-pillar", floors: HELL_FLOORS, weight: 3, spacing: 25,
    scene: eruption({
        spot: atPlace(fightsWhere(), { x: 18, y: 8, eitherSide: true }), jets: FIRE_JETS, times: 5, gap: 0.25,
    }),
})

/** The sea spouts a column of foam, twice. */
const SEA_SPOUT = sceneEffect({
    id: "sea-spout", floors: HARBOR_FLOORS, weight: 2, spacing: 25,
    scene: eruption({ spot: band(0.78, 0.9), jets: FOAM_JETS, times: 2, gap: 0.7 }),
})

/** What is brief and loud, bursting at a point. */
export const ERUPTION_EFFECTS: readonly AmbientEffect[] = [
    LAVA_GEYSER, EXPLOSION, ROCKFALL, AVALANCHE, STEAM_VENT, MARSH_BURST, SPECTRE_RISE, FLAME_PILLAR,
    SEA_SPOUT,
]
