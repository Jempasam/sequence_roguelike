import type { Random } from "../../../../../engine/particles"
import type { AmbientEffect } from "./AmbientEffect"
import { AmbientPool } from "./AmbientPool"
import { DEFEATED_GHOST } from "./subs/creatures/DefeatedGhost"
import { FLOCK_EFFECTS } from "./subs/creatures/flocks"
import { FOOTPRINTS } from "./subs/creatures/Footprints"
import { LEAP_EFFECTS } from "./subs/creatures/leaps"
import { MONSTER_LINE } from "./subs/creatures/MonsterLine"
import { MONSTER_PASSING } from "./subs/creatures/MonsterPassing"
import { SWARM_EFFECTS } from "./subs/creatures/swarms"
import { TRAVELING_MONSTER } from "./subs/creatures/TravelingMonster"
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

/** The background: soft and lasting, it may overlap with itself and with what passes. */
export const ATMOSPHERE_EFFECTS: readonly AmbientEffect[] = [
    ...DRIFT_EFFECTS, ...GLIDE_EFFECTS, ...SWARM_EFFECTS, WHIRL,
]

/** What crosses the map and draws the eye: one at a time, so none hides another. */
export const PASSING_EFFECTS: readonly AmbientEffect[] = [
    TRAVELING_MONSTER, MONSTER_PASSING, MONSTER_LINE, MINE_CART, LOST_COIN, DEFEATED_GHOST, FOOTPRINTS,
    ...FLOCK_EFFECTS, ...LEAP_EFFECTS,
]

/**
 * What comes and goes from the halts and the fights: characters, carts, groups, boats and things tossed out.
 * Many sorts, so they have a pool of their own, and one plays at a time.
 */
export const TRAFFIC_EFFECTS: readonly AmbientEffect[] = [
    ...FAMILY_EFFECTS, ITEM_EJECT, USABLE_EJECT, ...ENEMY_QUEUES, ...TAVERN_PARTIES, ...ALL_MONSTER_PARTIES,
    EDGE_TO_EDGE, BOAT_CROSSING, FISHER_BOAT_CROSSING,
]

/** What is rare, brief and loud: never two together, and far apart. */
export const EVENT_EFFECTS: readonly AmbientEffect[] = [
    LIGHTNING, BOSS_EYE, SHOOTING_STAR, ...ERUPTION_EFFECTS,
]

/** Every ambient effect of the map. */
export const AMBIENT_EFFECTS: readonly AmbientEffect[] = [
    ...ATMOSPHERE_EFFECTS, ...PASSING_EFFECTS, ...TRAFFIC_EFFECTS, ...EVENT_EFFECTS,
]

/**
 * The pools that play the ambient effects, one for each pace: each draws at its own rhythm and has its own
 * limit of effects playing at once.
 *
 * @param random - The randomness of the display, shared by the pools.
 * @param report - Where the error of an animation goes.
 */
export function ambientPools(random: Random, report: (error: unknown) => void): AmbientPool[] {
    const pool = (
        effects: readonly AmbientEffect[], interval: [number, number], maxPlaying: number,
    ): AmbientPool => new AmbientPool(effects, random, interval, maxPlaying, report)
    return [
        pool(ATMOSPHERE_EFFECTS, [6, 14], 2),
        pool(PASSING_EFFECTS, [12, 30], 1),
        pool(TRAFFIC_EFFECTS, [10, 25], 1),
        pool(EVENT_EFFECTS, [25, 60], 1),
    ]
}
