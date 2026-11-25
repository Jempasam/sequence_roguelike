import type { Rng } from "../../base/Rng"
import { floorLook } from "../../halt/SceneLook"
import { ELITE } from "../../fight/fights"
import { NECROMANCER_HALT } from "../../halt/subs/party/NecromancerHalt"
import { ALTAR_HALT } from "../../halt/subs/deck/AltarHalt"
import { HOSPITAL_HALT } from "../../halt/subs/party/HospitalHalt"
import type { FightCategory } from "../../fight/FightCategory"
import type { FightType } from "../../fight/FightType"
import { laidIn } from "../fights/designed"
import { GRAVEYARD_FIGHTS } from "../fights/graveyardFights"
import type { FloorType } from "../Floor"
import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Cimetière: Des morts qui ne restent pas couchés, et un roi liche au bout. Plus de nécromanciens, d'autels et d'élites. */
export class GraveyardFloor extends AbstractFloor {

    public readonly type: FloorType = GRAVEYARD_FLOOR

    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [NECROMANCER_HALT, 8], [ALTAR_HALT, 7], [ELITE, 11], [HOSPITAL_HALT, 4],
        )
    }

    protected fightFor(category: FightCategory, layer: number, rng: Rng): FightType {
        return laidIn(GRAVEYARD_FIGHTS, category, layer, rng, this.fightContext)
    }
}

/** The sort of Cimetière. */
export const GRAVEYARD_FLOOR: FloorType = {
    name: "Cimetière",
    description: "Des morts qui ne restent pas couchés, et un roi liche au bout. Plus de nécromanciens, d'autels et d'élites.",
    icon: visual("floors/graveyard/logo"),
    look: floorLook(24, 24, 36, "graveyard"),
    decorations: [
        { picture: visual("floors/graveyard/tombstone"), size: 2 },
        { picture: visual("floors/graveyard/cross"), size: 2 },
        { picture: visual("floors/graveyard/crypt"), size: 2 },
        { picture: visual("floors/graveyard/deadtree"), size: 2 },
        { picture: visual("floors/graveyard/candle"), size: 2 },
    ],
    create: level => new GraveyardFloor(level),
}
