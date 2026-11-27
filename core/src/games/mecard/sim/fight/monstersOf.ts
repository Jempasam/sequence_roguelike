import { Rng } from "../base/Rng"
import type { Monster } from "../catalog/monsters"

import type { FightStage } from "./Fight"

/**
 * The monsters a fight stands in its arena, in the order it adds them, read on a stage of its own: no run is
 * touched. The characters it adds, kits and ghosts, are no monsters.
 *
 * @param populating - What stands them: a fight type or a design of one.
 * @param layer - The row of the map its place lies in.
 */
export function monstersOf(populating: { populate(stage: FightStage): void }, layer = 0): Monster[] {
    const monsters: Monster[] = []
    populating.populate({
        rng: new Rng(0), level: 1, layer,
        add: monster => { monsters.push(monster) }, addKit: () => {}, addHero: () => {},
    })
    return monsters
}
