import type { Rng } from "../../base/Rng"
import { ICE_MAGE, HUNTER, WEREWOLF, BULL, OGRE_CRUSHER, FROST_GIANT } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import { TAVERN_HALT } from "../../halt/subs/gift/TavernHalt"
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
    shallow: [ICE_MAGE, HUNTER, WEREWOLF],
    middle: [BULL, ICE_MAGE, WEREWOLF],
    deep: [OGRE_CRUSHER, WEREWOLF, ICE_MAGE, BULL],
}

/** Toundra: Du froid, des loups et un géant de givre au bout. Plus de tavernes et d'hôpitaux. */
export class TundraFloor extends AbstractFloor {

    public readonly type: FloorType = TUNDRA_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [TAVERN_HALT, 9], [HOSPITAL_HALT, 9],
        )
    }

    protected monsters(fight: FightType, layer: number, rng: Rng): Monster[] {
        return tieredEncounter(TIERS, FROST_GIANT, fight, layer, this.level, rng)
    }
}

/** The sort of Toundra. */
export const TUNDRA_FLOOR: FloorType = {
    name: "Toundra",
    description: "Du froid, des loups et un géant de givre au bout. Plus de tavernes et d'hôpitaux.",
    icon: visual("floors/tundra/logo"),
    look: sceneLook(28, 36, 44, "tundra"),
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
