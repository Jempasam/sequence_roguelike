import type { Text } from "../../../../../../semantic"
import type { UnitContext } from "../../../battle/Action"
import { HeartCount } from "../../../battle/words"
import type { Unit } from "../../../battle/Unit"
import { Heart } from "../../../heart/Heart"
import type { HeartKind } from "../../../heart/HeartKind"

import type { Boon } from "./Boon"

/**
 * Hearts of a kind given to the unit, in place of a potion: the hearts are the whole of what it does for it.
 */
export class HeartsBoon implements Boon {


    constructor(
        public readonly heart: HeartKind,
        public readonly count: number,
    ){
        this.name = `${count} cœurs ${heart.name}`
        this.text = ["donne ", new HeartCount(count), " ", heart]
    }


    public readonly name: string
    public readonly text: Text

    public give(_ctx: UnitContext, target: Unit): void {
        for(let each = 0; each < this.count; each++) target.hearts.give(new Heart(this.heart))
    }
}
