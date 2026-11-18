import type { Rng } from "../../base/Rng"
import { sceneLook } from "../../halt/SceneLook"
import { ELITE } from "../../fight/fights"
import { BUTCHER_HALT } from "../../halt/subs/deck/ButcherHalt"
import { FORGE_HALT } from "../../halt/subs/deck/ForgeHalt"
import { CHEST_HALT } from "../../halt/subs/gift/ChestHalt"
import { HOSPITAL_HALT } from "../../halt/subs/party/HospitalHalt"
import type { FightCategory } from "../../fight/FightCategory"
import type { FightType } from "../../fight/FightType"
import { laidIn } from "../fights/designed"
import { MINE_FIGHTS } from "../fights/mineFights"
import type { FloorType } from "../Floor"

import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** The mine: the richest way, and the most guarded one. */
export class MineFloor extends AbstractFloor {


    public readonly type: FloorType = MINE_FLOOR


    /** Things to dig up and to work, and more elites guarding them. */
    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [FORGE_HALT, 9], [CHEST_HALT, 10], [BUTCHER_HALT, 5], [ELITE, 12], [HOSPITAL_HALT, 3],
        )
    }

    protected fightFor(category: FightCategory, layer: number, rng: Rng): FightType {
        return laidIn(MINE_FIGHTS, category, layer, rng)
    }
}

/** The sort of the mine. */
export const MINE_FLOOR: FloorType = {
    name: "Mine",
    description: "Des robots et de la pierre, et un robot megalaser au bout. Plus de forges, de coffres et d'élites.",
    icon: visual("floors/mine/logo"),
    look: sceneLook(34, 26, 20, "mine"),
    decorations: [
        { picture: visual("floors/mine/mountain"), size: 2 },
        { picture: visual("floors/mine/cart"), size: 2 },
        { picture: visual("floors/mine/ore"), size: 2 },
        { picture: visual("floors/mine/beam"), size: 2 },
        { picture: visual("floors/mine/gravel"), size: 2 },
    ],
    create: level => new MineFloor(level),
}
