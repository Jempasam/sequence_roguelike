import type { Rng } from "../../base/Rng"
import { BERSERKER, GOBLIN, ICE_MAGE, KAMIKAZE_ROBOT, MEGALASER, STONE_GOLEM } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import type { FightKind } from "../../run/Journey"
import { encounter } from "../encounter"
import type { FloorType } from "../Floor"

import { AbstractFloor } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"

/** Who lives in the mine. */
const MONSTERS: readonly Monster[] = [KAMIKAZE_ROBOT, STONE_GOLEM, GOBLIN, BERSERKER, ICE_MAGE]

/** The mine: the richest way, and the most guarded one. */
export class MineFloor extends AbstractFloor {


    public readonly type: FloorType = MINE_FLOOR


    /** Things to dig up and to work, and more elites guarding them. */
    protected override weights(): PlaceWeights {
        return { ...super.weights(), forge: 9, chest: 10, butcher: 5, elite: 12, hospital: 3 }
    }

    protected monsters(fight: FightKind, layer: number, rng: Rng): Monster[] {
        return encounter(MONSTERS, MEGALASER, fight, layer, this.level, rng)
    }
}

/** The sort of the mine. */
export const MINE_FLOOR: FloorType = {
    name: "Mine",
    description: "Des robots et de la pierre, et un robot megalaser au bout. Plus de forges, de coffres et d'élites.",
    icon: "mecard/floors/mine/logo.png",
    look: sceneLook(34, 26, 20, "mecard/floors/mine"),
    decorations: [
        { picture: "mecard/floors/mine/mountain.png", size: 2 },
        { picture: "mecard/floors/mine/cart.png", size: 2 },
        { picture: "mecard/floors/mine/ore.png", size: 2 },
        { picture: "mecard/floors/mine/beam.png", size: 2 },
        { picture: "mecard/floors/mine/gravel.png", size: 2 },
    ],
    create: level => new MineFloor(level),
}
