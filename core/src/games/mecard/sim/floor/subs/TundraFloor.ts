import type { Rng } from "../../base/Rng"
import { floorLook } from "../../halt/SceneLook"
import { TAVERN_HALT } from "../../halt/subs/gift/TavernHalt"
import { HOSPITAL_HALT } from "../../halt/subs/party/HospitalHalt"
import type { FightCategory } from "../../fight/FightCategory"
import type { FightType } from "../../fight/FightType"
import { laidIn } from "../fights/designed"
import { TUNDRA_FIGHTS } from "../fights/tundraFights"
import type { FloorType } from "../Floor"
import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Toundra: Du froid, des loups et un géant de givre au bout. Plus de tavernes et d'hôpitaux. */
export class TundraFloor extends AbstractFloor {

    public readonly type: FloorType = TUNDRA_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [TAVERN_HALT, 9], [HOSPITAL_HALT, 9],
        )
    }

    protected fightFor(category: FightCategory, layer: number, rng: Rng): FightType {
        return laidIn(TUNDRA_FIGHTS, category, layer, rng, this.fightContext)
    }
}

/** The sort of Toundra. */
export const TUNDRA_FLOOR: FloorType = {
    name: "Toundra",
    description: "Du froid, des loups et un géant de givre au bout. Plus de tavernes et d'hôpitaux.",
    icon: visual("floors/tundra/logo"),
    look: floorLook(28, 36, 44, "tundra"),
    decorations: [
        { picture: visual("floors/tundra/snow"), size: 2 },
        { picture: visual("floors/tundra/pine"), size: 2 },
        { picture: visual("floors/tundra/igloo"), size: 2 },
        { picture: visual("floors/tundra/iceblock"), size: 2 },
        { picture: visual("floors/tundra/snowman"), size: 2 },
        { picture: visual("floors/tundra/crystal"), size: 2 },
    ],
    create: level => new TundraFloor(level),
}
