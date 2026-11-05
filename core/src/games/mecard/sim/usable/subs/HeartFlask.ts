import type { UnitContext } from "../../battle/Action"
import { HeartCount } from "../../battle/words"
import { Heart } from "../../heart/Heart"
import type { HeartKind } from "../../heart/HeartKind"
import { SHIELD_HEART } from "../../heart/subs/ShieldHeartKind"

import { AbstractUsable } from "./AbstractUsable"

/** How many hearts the flasks of the catalog give. */
const FLASK_HEARTS = 2

/** A flask giving hearts of a kind, on top of the others. */
export class HeartFlask extends AbstractUsable {


    constructor(
        name: string,

        /** The kind of the hearts it gives. */
        public readonly kind: HeartKind,

        /** How many it gives. */
        public readonly count = FLASK_HEARTS,
    ){
        super(name, ["Donne ", new HeartCount(count), " ", kind, "."])
    }


    protected act({ unit }: UnitContext): void {
        for(const heart of Heart.many(this.kind, this.count)) unit.hearts.give(heart)
    }
}

export const SHIELD_FLASK = new HeartFlask("Fiole de garde", SHIELD_HEART)
