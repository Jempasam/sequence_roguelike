import type { UnitContext } from "../../../battle/Action"

import { AbstractUsable } from "../AbstractUsable"
import { DECK } from "../../../base/keywords"

/** A mixer: the hand and the discard put back in the deck, shuffled, and as many cards drawn again. */
export class Mixer extends AbstractUsable {


    constructor(){
        super(
            "Mélangeur", "mecard/usables/mixer.png", ["Remet la main et la défausse dans le ", DECK, ", rebat, puis repioche. Une fois par combat."],
            { charges: 1, refill: "battle" },
        )
    }


    protected act({ battle, unit }: UnitContext): void {
        battle.reshuffle(unit)
    }
}

export const MIXER = new Mixer()
