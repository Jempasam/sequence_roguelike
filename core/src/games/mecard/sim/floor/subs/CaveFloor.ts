import type { Rng } from "../../base/Rng"
import { sceneLook } from "../../halt/SceneLook"
import type { FightCategory } from "../../fight/FightCategory"
import type { FightType } from "../../fight/FightType"
import { laidIn } from "../fights/designed"
import { CAVE_FIGHTS } from "../fights/caveFights"
import type { FloorType } from "../Floor"

import { AbstractFloor } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** The cave: where every run starts, a bit of everything on the way. */
export class CaveFloor extends AbstractFloor {


    public readonly type: FloorType = CAVE_FLOOR


    protected fightFor(category: FightCategory, layer: number, rng: Rng): FightType {
        return laidIn(CAVE_FIGHTS, category, layer, rng)
    }
}

/** The sort of the cave. */
export const CAVE_FLOOR: FloorType = {
    name: "Grotte",
    description: "Des gobelins et leurs amis, gardés par un golem runique. Un peu de tout sur le chemin.",
    icon: visual("floors/cave/logo"),
    look: sceneLook(20, 18, 31, "map"),
    decorations: [
        { picture: visual("floors/cave/bigshroom"), size: 2 },
        { picture: visual("floors/cave/stalagmite"), size: 2 },
        { picture: visual("floors/cave/mushroom"), size: 2 },
        { picture: visual("floors/cave/bones"), size: 2 },
        { picture: visual("floors/cave/pebbles"), size: 2 },
    ],
    create: level => new CaveFloor(level),
}
