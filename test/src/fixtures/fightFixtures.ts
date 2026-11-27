import { fightType } from "@game/core-src/games/mecard/sim/fight/FightType"
import type { Monster } from "@game/core-src/games/mecard/sim/catalog/monsters"
import type { FightCategory } from "@game/core-src/games/mecard/sim/fight/FightCategory"
import type { FightType } from "@game/core-src/games/mecard/sim/fight/FightType"

/** How many fights {@link fightOf} made, for each to have an id of its own. */
let made = 0

/** A fight of a category against some monsters, standing where the monsters go by default. */
export function fightOf(category: FightCategory, ...monsters: readonly Monster[]): FightType {
    made++
    return fightType({
        id: `test-${category.id}-${made}`,
        name: `Combat ${made}`,
        description: "Un combat d'essai.",
        icon: category.icon,
        category,
        populate: stage => {
            for(const monster of monsters) stage.add(monster)
        },
    })
}
