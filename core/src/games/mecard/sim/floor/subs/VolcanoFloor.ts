import type { Rng } from "../../base/Rng"
import { FIRE_LIZARD, IMP, FIRE_MAGE, STONE_GOLEM, BERSERKER, MAGMA_DRAGON } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import { ELITE } from "../../fight/fights"
import { FORGE_HALT } from "../../halt/subs/deck/ForgeHalt"
import { DEMON_HALT } from "../../halt/subs/deck/DemonHalt"
import { HOSPITAL_HALT } from "../../halt/subs/party/HospitalHalt"
import type { FightType } from "../../fight/FightType"
import { tieredEncounter } from "../encounter"
import type { Tiers } from "../encounter"
import type { FloorType } from "../Floor"
import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Who lives on this floor, by depth. */
const TIERS: Tiers = {
    shallow: [FIRE_LIZARD, IMP, FIRE_MAGE],
    middle: [STONE_GOLEM, FIRE_LIZARD, BERSERKER],
    deep: [STONE_GOLEM, FIRE_MAGE, BERSERKER, FIRE_LIZARD],
}

/** Volcan: De la lave et des lézards de feu, et un dragon de magma au bout. Plus de forges et d'élites. */
export class VolcanoFloor extends AbstractFloor {

    public readonly type: FloorType = VOLCANO_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [FORGE_HALT, 9], [DEMON_HALT, 4], [ELITE, 12], [HOSPITAL_HALT, 3],
        )
    }

    protected monsters(fight: FightType, layer: number, rng: Rng): Monster[] {
        return tieredEncounter(TIERS, MAGMA_DRAGON, fight, layer, this.level, rng)
    }
}

/** The sort of Volcan. */
export const VOLCANO_FLOOR: FloorType = {
    name: "Volcan",
    description: "De la lave et des lézards de feu, et un dragon de magma au bout. Plus de forges et d'élites.",
    icon: visual("floors/volcano/logo"),
    look: sceneLook(42, 22, 12, "volcano"),
    decorations: [
        { picture: visual("floors/volcano/lava"), size: 2 },
        { picture: visual("floors/volcano/rock"), size: 2 },
        { picture: visual("floors/volcano/geyser"), size: 1.5 },
        { picture: visual("floors/volcano/obsidian"), size: 2 },
        { picture: visual("floors/volcano/bones"), size: 2 },
    ],
    create: level => new VolcanoFloor(level),
}
