import type { Rng } from "../../base/Rng"
import { HARPOON_PIRATE, GOBLIN_WRESTLER, TOXIC_TOAD, BRUTE, GARRISON_GOBLIN, SNIPER, KRAKEN_CAPTAIN } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import { MERCHANT_HALT } from "../../halt/subs/gift/MerchantHalt"
import { SHOP_HALT } from "../../halt/subs/gift/ShopHalt"
import { CHEST_HALT } from "../../halt/subs/gift/ChestHalt"
import type { FightType } from "../../fight/FightType"
import { tieredEncounter } from "../encounter"
import type { Tiers } from "../encounter"
import type { FloorType } from "../Floor"
import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Who lives on this floor, by depth. */
const TIERS: Tiers = {
    shallow: [HARPOON_PIRATE, GOBLIN_WRESTLER, TOXIC_TOAD],
    middle: [BRUTE, HARPOON_PIRATE, GARRISON_GOBLIN],
    deep: [HARPOON_PIRATE, BRUTE, GOBLIN_WRESTLER, SNIPER],
}

/** Port: Des pirates, des quais, et un capitaine Kraken au bout. Plus de marchands, de boutiques et de coffres. */
export class HarborFloor extends AbstractFloor {

    public readonly type: FloorType = HARBOR_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [MERCHANT_HALT, 8], [SHOP_HALT, 8], [CHEST_HALT, 8],
        )
    }

    protected monsters(fight: FightType, layer: number, rng: Rng): Monster[] {
        return tieredEncounter(TIERS, KRAKEN_CAPTAIN, fight, layer, this.level, rng)
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
