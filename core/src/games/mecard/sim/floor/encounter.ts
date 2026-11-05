import type { Rng } from "../base/Rng"
import type { Monster } from "../catalog/monsters"
import type { FightKind } from "../run/Journey"

/** How many monsters a battle of the first layer of a floor of level 1 holds. */
const FIRST_MONSTERS = 2

/** How many layers the party goes down for each monster more in its battles. */
const LAYERS_PER_MONSTER = 2

/** How many more monsters an elite holds than a battle of the same layer. */
const ELITE_EXTRA = 2

/** How many monsters a battle holds at most: what the top rows of the arena have room for. */
const MAX_MONSTERS = 7

/**
 * The monsters of a fight of a floor, drawn among those living there: more the higher its level and the
 * deeper the layer, a few more for an elite, the boss leading those of its layer.
 */
export function encounter(
    pool: readonly Monster[], boss: Monster, fight: FightKind, layer: number, level: number, rng: Rng,
): Monster[] {
    const extra = fight === "elite" ? ELITE_EXTRA : 0
    const count = FIRST_MONSTERS + level - 1 + Math.floor(layer / LAYERS_PER_MONSTER) + extra
    const monsters = Array.from({ length: Math.min(count, MAX_MONSTERS) }, () => pool[rng.int(pool.length)])
    if(fight === "boss") monsters.unshift(boss)
    return monsters.slice(0, MAX_MONSTERS)
}
