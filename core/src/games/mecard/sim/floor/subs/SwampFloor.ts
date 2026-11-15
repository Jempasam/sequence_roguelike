import type { Rng } from "../../base/Rng"
import { TOXIC_TOAD, SLIME, GOBLIN, MAD_ALCHEMIST, ELF_ARCHER, THORN_TANK, ORC_BATTLE_SHAMAN, HYDRA } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import { WITCH_HALT } from "../../halt/subs/gift/WitchHalt"
import { ALCHEMIST_HALT } from "../../halt/subs/deck/AlchemistHalt"
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
    shallow: [TOXIC_TOAD, SLIME, GOBLIN],
    middle: [MAD_ALCHEMIST, ELF_ARCHER, TOXIC_TOAD],
    deep: [MAD_ALCHEMIST, THORN_TANK, TOXIC_TOAD, ORC_BATTLE_SHAMAN],
}

/** Marais: Boue, poisons et crapauds, et une hydre au bout. Plus de sorcières, d'alchimistes et d'hôpitaux. */
export class SwampFloor extends AbstractFloor {

    public readonly type: FloorType = SWAMP_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [WITCH_HALT, 9], [ALCHEMIST_HALT, 7], [HOSPITAL_HALT, 8],
        )
    }

    protected monsters(fight: FightType, layer: number, rng: Rng): Monster[] {
        return tieredEncounter(TIERS, HYDRA, fight, layer, this.level, rng)
    }
}

/** The sort of Marais. */
export const SWAMP_FLOOR: FloorType = {
    name: "Marais",
    description: "Boue, poisons et crapauds, et une hydre au bout. Plus de sorcières, d'alchimistes et d'hôpitaux.",
    icon: visual("floors/swamp/logo"),
    look: sceneLook(28, 38, 22, "swamp"),
    decorations: [
        { picture: visual("floors/swamp/reed"), size: 2 },
        { picture: visual("floors/swamp/small_reed"), size: 2 },
        { picture: visual("floors/swamp/lily"), size: 2 },
        { picture: visual("floors/swamp/stump"), size: 2 },
        { picture: visual("floors/swamp/bubbles"), size: 2 },
        { picture: visual("floors/swamp/mushroom"), size: 2 },
        { picture: visual("floors/swamp/bigshroom"), size: 2 },
    ],
    create: level => new SwampFloor(level),
}
