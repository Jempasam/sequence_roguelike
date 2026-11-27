import type { Random } from "../../../../../engine/particles"
import type { AmbientCategory, AmbientEffect } from "./AmbientEffect"
import { AmbientPool } from "./AmbientPool"
import { RunAmbient } from "./RunAmbient"
import { DEFEATED_GHOST } from "./subs/creatures/DefeatedGhost"
import { FLOCK_EFFECTS } from "./subs/creatures/flocks"
import { FOOTPRINTS } from "./subs/creatures/Footprints"
import { LEAP_EFFECTS } from "./subs/creatures/leaps"
import { SWARM_EFFECTS } from "./subs/creatures/swarms"
import { DRIFT_EFFECTS } from "./subs/ground/drifts"
import { ERUPTION_EFFECTS } from "./subs/ground/eruptions"
import { GLIDE_EFFECTS } from "./subs/ground/glides"
import { WHIRL } from "./subs/ground/Whirl"
import { LOST_COIN } from "./subs/places/LostCoin"
import { MINE_CART } from "./subs/places/MineCart"
import { BOSS_EYE } from "./subs/sky/BossEye"
import { LIGHTNING } from "./subs/sky/Lightning"
import { SHOOTING_STAR } from "./subs/sky/ShootingStar"
import { BOAT_CROSSING, EDGE_TO_EDGE, FISHER_BOAT_CROSSING } from "./subs/traffic/crossings"
import { ITEM_EJECT, USABLE_EJECT } from "./subs/traffic/Ejection"
import { FAMILY_EFFECTS } from "./subs/traffic/families"
import { ALL_MONSTER_PARTIES, ENEMY_QUEUES, TAVERN_PARTIES } from "./subs/traffic/groups"
import { UNIT_BOND_EFFECTS } from "./subs/units/bonds"
import { UNIT_CLIMATE_EFFECTS } from "./subs/units/climate"
import { UNIT_MOOD_EFFECTS } from "./subs/units/moods"
import { UNIT_VISITOR_EFFECTS } from "./subs/units/visitors"

/** Every ambient effect of the map. */
export const AMBIENT_EFFECTS: readonly AmbientEffect[] = [
    ...DRIFT_EFFECTS, ...GLIDE_EFFECTS, ...SWARM_EFFECTS, WHIRL,
    ...FLOCK_EFFECTS, ...LEAP_EFFECTS, ...ERUPTION_EFFECTS, LIGHTNING, SHOOTING_STAR, BOSS_EYE,
    MINE_CART, LOST_COIN, DEFEATED_GHOST, FOOTPRINTS,
    ...FAMILY_EFFECTS, ...ENEMY_QUEUES, ...TAVERN_PARTIES, ...ALL_MONSTER_PARTIES,
    EDGE_TO_EDGE, BOAT_CROSSING, FISHER_BOAT_CROSSING, ITEM_EJECT, USABLE_EJECT,
    ...UNIT_CLIMATE_EFFECTS, ...UNIT_VISITOR_EFFECTS, ...UNIT_MOOD_EFFECTS, ...UNIT_BOND_EFFECTS,
]

/** How often a category plays while a space is shown. */
interface Pace {
    /** The shortest and the longest wait between two tries, in seconds. */
    readonly interval: readonly [number, number]

    /** The most animations of the category playing at once. */
    readonly maxPlaying: number
}

/** The pace of each category. A space is shown a few seconds only, so even the rare ones wait little. */
const PACES: Readonly<Record<AmbientCategory, Pace>> = {
    backdrop: { interval: [5, 6], maxPlaying: 2 },
    signature: { interval: [5, 9], maxPlaying: 1 },
    traffic: { interval: [5, 8], maxPlaying: 2 },
    weather: { interval: [8, 12], maxPlaying: 1 },
    surprise: { interval: [10, 15], maxPlaying: 1 },
    unit: { interval: [4, 6], maxPlaying: 2 },
}

/** A pool for each category, over its effects. */
function poolsOf(random: Random, report: (error: unknown) => void): Record<AmbientCategory, AmbientPool> {
    const pool = (category: AmbientCategory): AmbientPool => {
        const effects = AMBIENT_EFFECTS.filter(effect => effect.category === category)
        const { interval, maxPlaying } = PACES[category]
        return new AmbientPool(effects, random, interval, maxPlaying, report)
    }
    return {
        backdrop: pool("backdrop"),
        signature: pool("signature"),
        traffic: pool("traffic"),
        weather: pool("weather"),
        surprise: pool("surprise"),
        unit: pool("unit"),
    }
}

/**
 * The pools that play the ambient effects, one for each category: each draws at its own pace and has its own
 * limit of effects playing at once.
 *
 * @param random - The randomness of the display, shared by the pools.
 * @param report - Where the error of an animation goes.
 */
export function ambientPools(random: Random, report: (error: unknown) => void): AmbientPool[] {
    return Object.values(poolsOf(random, report))
}

/**
 * The ambient of a run over a pool for each category. A space opens with a signature or traffic, with a
 * backdrop and with something about its units, never with weather nor a surprise.
 *
 * @param random - The randomness of the display, shared by the pools.
 * @param report - Where the error of an animation goes.
 */
export function runAmbient(random: Random, report: (error: unknown) => void): RunAmbient {
    const pools = poolsOf(random, report)
    return new RunAmbient(Object.values(pools), {
        ranks: [[pools.signature, pools.traffic], [pools.backdrop], [pools.unit]],
        random,
    })
}
