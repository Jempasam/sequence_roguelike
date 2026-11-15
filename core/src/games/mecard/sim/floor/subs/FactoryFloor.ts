import type { Rng } from "../../base/Rng"
import { GARRISON_GOBLIN, KAMIKAZE_ROBOT, GOBLIN_WRESTLER, GOBLIN_PILOT, SNIPER, GOBLIN_MECHA } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import { INVENTOR_HALT } from "../../halt/subs/gift/InventorHalt"
import { FORGE_HALT } from "../../halt/subs/deck/ForgeHalt"
import type { FightType } from "../../fight/FightType"
import { tieredEncounter } from "../encounter"
import type { Tiers } from "../encounter"
import type { FloorType } from "../Floor"
import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Who lives on this floor, by depth. */
const TIERS: Tiers = {
    shallow: [GARRISON_GOBLIN, KAMIKAZE_ROBOT, GOBLIN_WRESTLER],
    middle: [GOBLIN_PILOT, SNIPER, KAMIKAZE_ROBOT],
    deep: [GOBLIN_PILOT, SNIPER, KAMIKAZE_ROBOT, GOBLIN_PILOT],
}

/** Usine gobelin: Des robots, des gobelins pilotes, et un mécha-gobelin au bout. Plus d'inventeurs et de forges. */
export class FactoryFloor extends AbstractFloor {

    public readonly type: FloorType = FACTORY_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [INVENTOR_HALT, 9], [FORGE_HALT, 7],
        )
    }

    protected monsters(fight: FightType, layer: number, rng: Rng): Monster[] {
        return tieredEncounter(TIERS, GOBLIN_MECHA, fight, layer, this.level, rng)
    }
}

/** The sort of Usine gobelin. */
export const FACTORY_FLOOR: FloorType = {
    name: "Usine gobelin",
    description: "Des robots, des gobelins pilotes, et un mécha-gobelin au bout. Plus d'inventeurs et de forges.",
    icon: visual("floors/factory/logo"),
    look: sceneLook(38, 34, 24, "factory"),
    decorations: [
        { picture: visual("floors/factory/gear"), size: 2 },
        { picture: visual("floors/factory/small_gear"), size: 2 },
        { picture: visual("floors/factory/pipe"), size: 2 },
        { picture: visual("floors/factory/factory"), size: 2 },
        { picture: visual("floors/factory/lamp"), size: 2 },
        { picture: visual("floors/factory/crate"), size: 2 },
    ],
    create: level => new FactoryFloor(level),
}
