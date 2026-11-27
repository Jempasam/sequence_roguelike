import { visual } from "../../../../../sim/base/Visual"
import type { AmbientEffect } from "../../AmbientEffect"
import type { Grain } from "../../scene/Grain"
import { sceneEffect } from "../../scene/sceneEffect"
import { BUTTERFLY_FLOORS, CROW_FLOORS, HARBOR_FLOORS, ROT_FLOORS } from "../../themes"
import { bodies, playerHeroes } from "../../unit/selection"
import { companion } from "../../unit/subs/companion"
import { hop } from "../../unit/subs/hop"
import { perch } from "../../unit/subs/perch"

const BIRD: Grain = { sprite: visual("ambient/bird"), colors: [0xffffff], size: [7, 7] }
const SEAGULL: Grain = { sprite: visual("ambient/seagull"), colors: [0xffffff], size: [10, 10] }
const CROW: Grain = { sprite: visual("ambient/crow"), colors: [0xffffff], size: [9, 9] }

/** A bird sits on a head: a crow, a gull or a small bird, as the floor goes. */
const PERCHING_BIRD = sceneEffect({
    id: "perching-bird", category: "unit", outdoors: true, weight: 3,
    scene: perch({
        among: bodies, stay: 5,
        being: context => {
            const floor = context.floor()
            if(CROW_FLOORS.includes(floor)) return CROW
            return HARBOR_FLOORS.includes(floor) ? SEAGULL : BIRD
        },
    }),
})

/** A butterfly circles a unit, lands on it, then goes to another. */
const CURIOUS_BUTTERFLY = sceneEffect({
    id: "curious-butterfly", category: "unit", floors: BUTTERFLY_FLOORS, weight: 3,
    scene: hop({
        among: bodies, least: 1, stops: 2, flight: 1.2, circle: 1.6, rest: 0.7, radius: 14, arc: 12,
        grain: {
            sprite: visual("ambient/butterfly"), colors: [0xffd34d, 0xff8ad0, 0x8ad0ff, 0xffffff], size: [7, 7],
        },
    }),
})

/** A will-o'-the-wisp stays by a unit, and runs away when another comes near. */
const SHY_WISP = sceneEffect({
    id: "shy-wisp", category: "unit", floors: ROT_FLOORS, weight: 2,
    scene: companion({
        among: bodies, most: 1, anchor: "head", duration: 8, fade: 0.8, flicker: 0.3, flees: 24,
        grain: { colors: [0x6affd0, 0x6ac8ff], size: [3, 4], glow: true },
        way: age => ({ x: Math.cos(age * 1.5) * 12, y: Math.sin(age * 2.5) * 5 - 4 }),
    }),
})

/** A crow dives on a hero, snatches a coin and makes off with it: the gold of the party does not change. */
const COIN_MAGPIE = sceneEffect({
    id: "coin-magpie", category: "unit", outdoors: true, weight: 1, spacing: 20,
    scene: perch({ among: playerHeroes, being: () => CROW, stay: 0.6, loot: context => context.coin() }),
})

/** The small beings that come to the units. */
export const UNIT_VISITOR_EFFECTS: readonly AmbientEffect[] = [
    PERCHING_BIRD, CURIOUS_BUTTERFLY, SHY_WISP, COIN_MAGPIE,
]
