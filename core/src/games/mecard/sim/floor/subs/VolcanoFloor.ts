import type { Rng } from "../../base/Rng"
import { floorLook } from "../../halt/SceneLook"
import { ELITE } from "../../fight/fights"
import { FORGE_HALT } from "../../halt/subs/deck/ForgeHalt"
import { DEMON_HALT } from "../../halt/subs/deck/DemonHalt"
import { HOSPITAL_HALT } from "../../halt/subs/party/HospitalHalt"
import type { FightCategory } from "../../fight/FightCategory"
import type { FightType } from "../../fight/FightType"
import { laidIn } from "../fights/designed"
import { VOLCANO_FIGHTS } from "../fights/volcanoFights"
import type { FloorType } from "../Floor"
import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Volcan: De la lave et des lézards de feu, et un dragon de magma au bout. Plus de forges et d'élites. */
export class VolcanoFloor extends AbstractFloor {

    public readonly type: FloorType = VOLCANO_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [FORGE_HALT, 9], [DEMON_HALT, 4], [ELITE, 12], [HOSPITAL_HALT, 3],
        )
    }

    protected fightFor(category: FightCategory, layer: number, rng: Rng): FightType {
        return laidIn(VOLCANO_FIGHTS, category, layer, rng, this.fightContext)
    }
}

/** The sort of Volcan. */
export const VOLCANO_FLOOR: FloorType = {
    name: "Volcan",
    description: "De la lave et des lézards de feu, et un dragon de magma au bout. Plus de forges et d'élites.",
    icon: visual("floors/volcano/logo"),
    look: floorLook(42, 22, 12, "volcano"),
    decorations: [
        { picture: visual("floors/volcano/lava"), size: 2 },
        { picture: visual("floors/volcano/rock"), size: 2 },
        { picture: visual("floors/volcano/geyser"), size: 1 },
        { picture: visual("floors/volcano/obsidian"), size: 2 },
        { picture: visual("floors/volcano/bones"), size: 2 },
    ],
    create: level => new VolcanoFloor(level),
}
