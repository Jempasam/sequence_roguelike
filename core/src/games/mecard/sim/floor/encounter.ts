import type { Rng } from "../base/Rng"
import type { Monster } from "../catalog/monsters"
import { BOSS, ELITE } from "../fight/fights"
import type { FightType } from "../fight/FightType"

/** How many monsters a battle of the first layer of a floor of level 1 holds. */
const FIRST_MONSTERS = 2

/** How many layers the party goes down for each monster more in its battles. */
const LAYERS_PER_MONSTER = 2

/** How many more monsters an elite holds than a battle of the same layer. */
const ELITE_EXTRA = 2

/** How many monsters a battle holds at most: what the top rows of the arena have room for. */
const MAX_MONSTERS = 7

/** The layer the middle monsters of a floor start at. */
const MIDDLE_LAYER = 4

/** The layer the deep monsters of a floor start at. */
const DEEP_LAYER = 8

/** The monsters of a floor by depth: those met at its start, in its middle, and deep down or in an elite. */
export interface Tiers {
    readonly shallow: readonly Monster[]
    readonly middle: readonly Monster[]
    readonly deep: readonly Monster[]
}

/**
 * Like {@link encounter}, but the pool changes with the depth: light monsters first, the heavy ones in the
 * deeper layers and in the elites, so the fights of a floor are not all alike.
 */
export function tieredEncounter(
    tiers: Tiers, boss: Monster, fight: FightType, layer: number, level: number, rng: Rng,
): Monster[] {
    const pool = fight === ELITE || layer >= DEEP_LAYER ? tiers.deep
        : layer >= MIDDLE_LAYER ? [...tiers.shallow, ...tiers.middle, ...tiers.deep] : tiers.shallow
    return encounter(pool, boss, fight, layer, level, rng)
}

/**
 * The monsters of a fight of a floor, drawn among those living there: more the higher its level and the
 * deeper the layer, a few more for an elite, the boss leading those of its layer.
 */
export function encounter(
    pool: readonly Monster[], boss: Monster, fight: FightType, layer: number, level: number, rng: Rng,
): Monster[] {
    const extra = fight === ELITE ? ELITE_EXTRA : 0
    const count = FIRST_MONSTERS + level - 1 + Math.floor(layer / LAYERS_PER_MONSTER) + extra
    const monsters = Array.from({ length: Math.min(count, MAX_MONSTERS) }, () => pool[rng.int(pool.length)])
    if(fight === BOSS) monsters.unshift(boss)
    return monsters.slice(0, MAX_MONSTERS)
}
