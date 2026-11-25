import { DISTANCE } from "../../../base/keywords"
import type { Status } from "../../../status/Status"
import { Burn } from "../../../status/subs/Burn"

import { THROW_RANGE, ThrownFlask } from "./ThrownFlask"
import { visual } from "../../../base/Visual"

/** How many rounds the fire flask of the catalog sets its target burning for. */
const FIRE_FLASK_BURN = 2

/** How many times the fire flask of the catalog may be thrown. */
const FIRE_FLASK_CHARGES = 6

/** A flask setting the nearest enemy burning. */
export class FireFlask extends ThrownFlask {


    constructor(
        range: number,

        /** How many rounds it sets its target burning for. */
        public readonly burn: number,

        charges = 1,
    ){
        super(
            "Flasque de feu", visual("usables/fire_flask"),
            ["L'ennemi le plus proche, à ", range, " ", DISTANCE, " au plus, prend ", new Burn(burn), "."],
            range, charges,
        )
    }


    public status(): Status {
        return new Burn(this.burn)
    }
}

export const FIRE_FLASK = new FireFlask(THROW_RANGE, FIRE_FLASK_BURN, FIRE_FLASK_CHARGES)
