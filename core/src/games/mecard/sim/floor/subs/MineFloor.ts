import type { Rng } from "../../base/Rng"
import { BERSERKER, GOBLIN, ICE_MAGE, KAMIKAZE_ROBOT, MEGALASER, STONE_GOLEM } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import { ELITE } from "../../catalog/fights"
import { BUTCHER_HALT } from "../../halt/subs/deck/ButcherHalt"
import { FORGE_HALT } from "../../halt/subs/deck/ForgeHalt"
import { CHEST_HALT } from "../../halt/subs/gift/ChestHalt"
import { HOSPITAL_HALT } from "../../halt/subs/party/HospitalHalt"
import type { FightType } from "../../run/PlaceType"
import { encounter } from "../encounter"
import type { FloorType } from "../Floor"

import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"

/** Who lives in the mine. */
const MONSTERS: readonly Monster[] = [KAMIKAZE_ROBOT, STONE_GOLEM, GOBLIN, BERSERKER, ICE_MAGE]

/** The mine: the richest way, and the most guarded one. */
export class MineFloor extends AbstractFloor {


    public readonly type: FloorType = MINE_FLOOR


    /** Things to dig up and to work, and more elites guarding them. */
    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [FORGE_HALT, 9], [CHEST_HALT, 10], [BUTCHER_HALT, 5], [ELITE, 12], [HOSPITAL_HALT, 3],
        )
    }

    protected monsters(fight: FightType, layer: number, rng: Rng): Monster[] {
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
