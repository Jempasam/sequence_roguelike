import { DISTANCE } from "../../../base/keywords"
import type { Status } from "../../../status/Status"
import { Rooted } from "../../../status/subs/Rooted"

import { THROW_RANGE, ThrownFlask } from "./ThrownFlask"
import { visual } from "../../../base/Visual"

/** How many steps the glue flask of the catalog roots its target for. */
const GLUE_ROOT = 2

/** How many times the glue flask of the catalog may be thrown. */
const GLUE_FLASK_CHARGES = 6

/** A flask rooting the nearest enemy. */
export class GlueFlask extends ThrownFlask {


    constructor(
        range: number,

        /** How many steps it roots its target for. */
        public readonly root: number,

        charges = 1,
    ){
        super(
            "Flasque de glu", visual("usables/glue_flask"),
            ["L'ennemi le plus proche, à ", range, " ", DISTANCE, " au plus, est ", new Rooted(root), "."],
            range, charges,
        )
    }


    public status(): Status {
        return new Rooted(this.root)
    }
}

export const GLUE_FLASK = new GlueFlask(THROW_RANGE, GLUE_ROOT, GLUE_FLASK_CHARGES)
