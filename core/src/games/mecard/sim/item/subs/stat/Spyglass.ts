import type { Attribute } from "../../../base/Attribute"
import { meters } from "../../../battle/words"
import type { UnitStats } from "../../../battle/Unit"
import { AIM } from "../../../card/subs/movement/Aim"

import { StatItem } from "./StatItem"

/** How much farther the spyglass of the catalog lets the aim look, in meters. */
const SPYGLASS_RANGE = 2

/** A spyglass letting the aim look farther. */
export class Spyglass extends StatItem {


    constructor(
        /** How much farther it lets the aim look, in meters. */
        range: number,
    ){
        super("Longue-vue", [AIM, " porte ", meters(range), " plus loin."], range)
    }


    public stat(stats: UnitStats): Attribute<number> {
        return stats.aimRange
    }
}

export const SPYGLASS = new Spyglass(SPYGLASS_RANGE)
