import type { Rng } from "../../base/Rng"
import { sceneLook } from "../../halt/SceneLook"
import { MERCHANT_HALT } from "../../halt/subs/gift/MerchantHalt"
import { SHOP_HALT } from "../../halt/subs/gift/ShopHalt"
import { CHEST_HALT } from "../../halt/subs/gift/ChestHalt"
import type { FightCategory } from "../../fight/FightCategory"
import type { FightType } from "../../fight/FightType"
import { laidIn } from "../fights/designed"
import { HARBOR_FIGHTS } from "../fights/harborFights"
import type { FloorType } from "../Floor"
import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Port: Des pirates, des quais, et un capitaine Kraken au bout. Plus de marchands, de boutiques et de coffres. */
export class HarborFloor extends AbstractFloor {

    public readonly type: FloorType = HARBOR_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [MERCHANT_HALT, 8], [SHOP_HALT, 8], [CHEST_HALT, 8],
        )
    }

    protected fightFor(category: FightCategory, layer: number, rng: Rng): FightType {
        return laidIn(HARBOR_FIGHTS, category, layer, rng)
    }
}

/** The sort of Port. */
export const HARBOR_FLOOR: FloorType = {
    name: "Port",
    description: "Des pirates, des quais, et un capitaine Kraken au bout. Plus de marchands, de boutiques et de coffres.",
    icon: visual("floors/harbor/logo"),
    look: sceneLook(20, 34, 44, "harbor"),
    decorations: [
        { picture: visual("floors/harbor/anchor"), size: 2 },
        { picture: visual("floors/harbor/wave"), size: 2 },
        { picture: visual("floors/harbor/mast"), size: 2 },
        { picture: visual("floors/harbor/buoy"), size: 2 },
        { picture: visual("floors/harbor/small_wave"), size: 2 },
    ],
    create: level => new HarborFloor(level),
}
