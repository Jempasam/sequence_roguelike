import type { Rng } from "../../base/Rng"
import { ARCHER, BRUTE, GOBLIN, GOLEM, SLIME } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import type { FightType } from "../../run/PlaceType"
import { encounter } from "../encounter"
import type { FloorType } from "../Floor"

import { AbstractFloor } from "./AbstractFloor"

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
    icon: "mecard/floors/cave/logo.png",
    look: sceneLook(20, 18, 31, "mecard/travel/map"),
    decorations: [
        { picture: "mecard/floors/cave/mouth.png", size: 2 },
        { picture: "mecard/floors/cave/stalagmite.png", size: 2 },
        { picture: "mecard/floors/cave/mushroom.png", size: 2 },
        { picture: "mecard/floors/cave/bones.png", size: 2 },
        { picture: "mecard/floors/cave/pebbles.png", size: 2 },
    ],
    create: level => new CaveFloor(level),
}
