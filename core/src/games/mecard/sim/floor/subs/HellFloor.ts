import type { Rng } from "../../base/Rng"
import { BERSERKER, BRUTE, DEVIL, ELF_ASSASSIN, FIRE_MAGE, IMP } from "../../catalog/monsters"
import type { Monster } from "../../catalog/monsters"
import { sceneLook } from "../../halt/SceneLook"
import { ELITE } from "../../catalog/fights"
import { ALTAR_HALT } from "../../halt/subs/deck/AltarHalt"
import { DEMON_HALT } from "../../halt/subs/deck/DemonHalt"
import { HOSPITAL_HALT } from "../../halt/subs/party/HospitalHalt"
import { MAD_DOCTOR_HALT } from "../../halt/subs/party/MadDoctorHalt"
import type { FightType } from "../../run/PlaceType"
import { encounter } from "../encounter"
import type { FloorType } from "../Floor"

import { AbstractFloor, reweighted } from "./AbstractFloor"
import type { PlaceWeights } from "./AbstractFloor"

/** Who lives in hell. */
const MONSTERS: readonly Monster[] = [FIRE_MAGE, BERSERKER, BRUTE, ELF_ASSASSIN, IMP]

/** Hell: the last floor of a round, before the cave again, harder. */
export class HellFloor extends AbstractFloor {


    public readonly type: FloorType = HELL_FLOOR


    /** Dark bargains, and little rest. */
    protected override weights(): PlaceWeights {
        return reweighted(
            super.weights(), [DEMON_HALT, 6], [ALTAR_HALT, 7], [MAD_DOCTOR_HALT, 4], [ELITE, 12], [HOSPITAL_HALT, 2],
        )
    }

    protected monsters(fight: FightType, layer: number, rng: Rng): Monster[] {
        return encounter(MONSTERS, DEVIL, fight, layer, this.level, rng)
    }
}

/** The sort of hell. */
export const HELL_FLOOR: FloorType = {
    name: "Enfer",
    description: "Du feu et de la rage, et le diable au bout. Plus de démons, d'autels et d'élites, peu d'hôpitaux.",
    icon: "mecard/floors/hell/logo.png",
    look: sceneLook(38, 14, 14, "mecard/floors/hell"),
    decorations: [
        { picture: "mecard/floors/hell/statue.png", size: 2 },
        { picture: "mecard/floors/hell/flame.png", size: 2 },
        { picture: "mecard/floors/hell/skull.png", size: 2 },
        { picture: "mecard/floors/hell/spike.png", size: 2 },
        { picture: "mecard/floors/hell/crack.png", size: 2 },
    ],
    create: level => new HellFloor(level),
}
