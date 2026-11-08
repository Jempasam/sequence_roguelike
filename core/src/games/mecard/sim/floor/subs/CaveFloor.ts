import type { Rng } from "../../base/Rng"
import { ARCHER, BRUTE, GOBLIN, GOLEM, SLIME } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import type { FightType } from "../../run/PlaceType"
import { encounter } from "../encounter"
import type { FloorType } from "../Floor"

import { AbstractFloor } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Who lives in the cave. */
const MONSTERS: readonly Monster[] = [GOBLIN, ARCHER, BRUTE, SLIME]

/** The cave: where every run starts, a bit of everything on the way. */
export class CaveFloor extends AbstractFloor {


    public readonly type: FloorType = CAVE_FLOOR


    protected monsters(fight: FightType, layer: number, rng: Rng): Monster[] {
        return encounter(MONSTERS, GOLEM, fight, layer, this.level, rng)
    }
}

/** The sort of the cave. */
export const CAVE_FLOOR: FloorType = {
    name: "Grotte",
    description: "Des gobelins et leurs amis, gardés par un golem runique. Un peu de tout sur le chemin.",
    icon: visual("floors/cave/logo"),
    look: sceneLook(20, 18, 31, "mecard/travel/map"),
    decorations: [
        { picture: visual("floors/cave/mouth"), size: 2 },
        { picture: visual("floors/cave/stalagmite"), size: 2 },
        { picture: visual("floors/cave/mushroom"), size: 2 },
        { picture: visual("floors/cave/bones"), size: 2 },
        { picture: visual("floors/cave/pebbles"), size: 2 },
    ],
    create: level => new CaveFloor(level),
}
