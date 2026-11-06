import { meters } from "../../../battle/words"
import type { Status } from "../../../status/Status"
import { Burn } from "../../../status/subs/Burn"

import { THROW_RANGE, ThrownFlask } from "./ThrownFlask"

/** How many rounds the fire flask of the catalog sets its target burning for. */
const FIRE_FLASK_BURN = 3

/** A flask setting the nearest enemy burning. */
export class FireFlask extends ThrownFlask {


    constructor(
        range: number,

        /** How many rounds it sets its target burning for. */
        public readonly burn: number,
    ){
        super(
            "Flasque de feu", "mecard/usables/fire_flask.png",
            ["L'ennemi le plus proche, à ", meters(range), " au plus, prend ", new Burn(burn), "."],
            range,
        )
    }


    public status(): Status {
        return new Burn(this.burn)
    }
}

export const FIRE_FLASK = new FireFlask(THROW_RANGE, FIRE_FLASK_BURN)
