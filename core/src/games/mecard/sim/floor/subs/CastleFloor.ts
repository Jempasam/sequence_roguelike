import type { Rng } from "../../base/Rng"
import { sceneLook } from "../../halt/SceneLook"
import { FORGE_HALT } from "../../halt/subs/deck/ForgeHalt"
import { STRATEGIST_HALT } from "../../halt/subs/deck/StrategistHalt"
import { MERCHANT_HALT } from "../../halt/subs/gift/MerchantHalt"
import type { FightCategory } from "../../fight/FightCategory"
import type { FightType } from "../../fight/FightType"
import { laidIn } from "../fights/designed"
import { CASTLE_FIGHTS } from "../fights/castleFights"
import type { FloorType } from "../Floor"
import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Château: Des gardes, des chevaliers et un seigneur noir au bout. Plus de forges, de stratèges et de marchands. */
export class CastleFloor extends AbstractFloor {

    public readonly type: FloorType = CASTLE_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [FORGE_HALT, 7], [STRATEGIST_HALT, 7], [MERCHANT_HALT, 8],
        )
    }

    protected fightFor(category: FightCategory, layer: number, rng: Rng): FightType {
        return laidIn(CASTLE_FIGHTS, category, layer, rng, this.fightContext)
    }
}

/** The sort of Château. */
export const CASTLE_FLOOR: FloorType = {
    name: "Château",
    description: "Des gardes, des chevaliers et un seigneur noir au bout. Plus de forges, de stratèges et de marchands.",
    icon: visual("floors/castle/logo"),
    look: sceneLook(30, 28, 34, "castle"),
    decorations: [
        { picture: visual("floors/castle/tower"), size: 2 },
        { picture: visual("floors/castle/banner"), size: 2 },
        { picture: visual("floors/castle/torch"), size: 2 },
        { picture: visual("floors/castle/armor"), size: 2 },
        { picture: visual("floors/castle/barrel"), size: 2 },
    ],
    create: level => new CastleFloor(level),
}
