import type { Rng } from "../../base/Rng"
import { sceneLook } from "../../halt/SceneLook"
import { ELITE } from "../../fight/fights"
import { ALTAR_HALT } from "../../halt/subs/deck/AltarHalt"
import { DEMON_HALT } from "../../halt/subs/deck/DemonHalt"
import { HOSPITAL_HALT } from "../../halt/subs/party/HospitalHalt"
import { MAD_DOCTOR_HALT } from "../../halt/subs/party/MadDoctorHalt"
import type { FightCategory } from "../../fight/FightCategory"
import type { FightType } from "../../fight/FightType"
import { laidIn } from "../fights/designed"
import { HELL_FIGHTS } from "../fights/hellFights"
import type { FloorType } from "../Floor"

import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"
import { visual } from "../../base/Visual"

/** Hell: the last floor of a round, before the cave again, harder. */
export class HellFloor extends AbstractFloor {


    public readonly type: FloorType = HELL_FLOOR


    /** Dark bargains, and little rest. */
    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [DEMON_HALT, 6], [ALTAR_HALT, 7], [MAD_DOCTOR_HALT, 4], [ELITE, 12], [HOSPITAL_HALT, 2],
        )
    }

    protected fightFor(category: FightCategory, layer: number, rng: Rng): FightType {
        return laidIn(HELL_FIGHTS, category, layer, rng)
    }
}

/** The sort of hell. */
export const HELL_FLOOR: FloorType = {
    name: "Enfer",
    description: "Du feu et de la rage, et le diable au bout. Plus de démons, d'autels et d'élites, peu d'hôpitaux.",
    icon: visual("floors/hell/logo"),
    look: sceneLook(38, 14, 14, "hell"),
    decorations: [
        { picture: visual("floors/hell/statue"), size: 2 },
        { picture: visual("floors/hell/flame"), size: 2 },
        { picture: visual("floors/hell/skull"), size: 2 },
        { picture: visual("floors/hell/spike"), size: 2 },
        { picture: visual("floors/hell/crack"), size: 2 },
    ],
    create: level => new HellFloor(level),
}
