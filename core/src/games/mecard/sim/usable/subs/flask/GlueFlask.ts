import { meters } from "../../../battle/words"
import type { Status } from "../../../status/Status"
import { Rooted } from "../../../status/subs/Rooted"

import { THROW_RANGE, ThrownFlask } from "./ThrownFlask"

/** How many steps the glue flask of the catalog roots its target for. */
const GLUE_ROOT = 3

/** A flask rooting the nearest enemy. */
export class GlueFlask extends ThrownFlask {


    constructor(
        range: number,

        /** How many steps it roots its target for. */
        public readonly root: number,
    ){
        super(
            "Flasque de glu",
            ["L'ennemi le plus proche, à ", meters(range), " au plus, est ", new Rooted(root), "."],
            range,
        )
    }


    public status(): Status {
        return new Rooted(this.root)
    }
}

export const GLUE_FLASK = new GlueFlask(THROW_RANGE, GLUE_ROOT)
