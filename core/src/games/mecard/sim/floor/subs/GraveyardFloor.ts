import type { Rng } from "../../base/Rng"
import { GHOST, SKELETON_REAPER, HAUNTING_GHOST, VENGEFUL_SPIRIT, WEREWOLF, LICH_KING } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import { ELITE } from "../../fight/fights"
import { NECROMANCER_HALT } from "../../halt/subs/party/NecromancerHalt"
import { ALTAR_HALT } from "../../halt/subs/deck/AltarHalt"
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
    shallow: [GHOST, SKELETON_REAPER, HAUNTING_GHOST],
    middle: [VENGEFUL_SPIRIT, WEREWOLF, GHOST],
    deep: [VENGEFUL_SPIRIT, SKELETON_REAPER, WEREWOLF, HAUNTING_GHOST],
}

/** Cimetière: Des morts qui ne restent pas couchés, et un roi liche au bout. Plus de nécromanciens, d'autels et d'élites. */
export class GraveyardFloor extends AbstractFloor {

    public readonly type: FloorType = GRAVEYARD_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [NECROMANCER_HALT, 8], [ALTAR_HALT, 7], [ELITE, 11], [HOSPITAL_HALT, 4],
        )
    }

    protected monsters(fight: FightType, layer: number, rng: Rng): Monster[] {
        return tieredEncounter(TIERS, LICH_KING, fight, layer, this.level, rng)
    }
}

/** The sort of Cimetière. */
export const GRAVEYARD_FLOOR: FloorType = {
    name: "Cimetière",
    description: "Des morts qui ne restent pas couchés, et un roi liche au bout. Plus de nécromanciens, d'autels et d'élites.",
    icon: visual("floors/graveyard/logo"),
    look: sceneLook(24, 24, 36, "graveyard"),
    decorations: [
        { picture: visual("floors/graveyard/tombstone"), size: 2 },
        { picture: visual("floors/graveyard/cross"), size: 2 },
        { picture: visual("floors/graveyard/crypt"), size: 2 },
        { picture: visual("floors/graveyard/deadtree"), size: 2 },
        { picture: visual("floors/graveyard/candle"), size: 2 },
    ],
    create: level => new GraveyardFloor(level),
}
