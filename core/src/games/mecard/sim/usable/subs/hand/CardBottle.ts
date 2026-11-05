import type { UnitContext } from "../../../battle/Action"
import type { Card } from "../../../card/Card"
import { THRUST } from "../../../card/subs/attack/Thrust"

import { AbstractUsable } from "../AbstractUsable"

/** How many times the bottles of cards of the catalog are used before they break. */
const CARD_BOTTLE_CHARGES = 3

/** A bottle of a card: a copy of the card in hand at each use, broken after its last. */
export class CardBottle extends AbstractUsable {


    constructor(
        name: string,

        /** The card it gives. */
        public readonly card: Card,

        charges: number,
    ){
        super(name, ["Donne un exemplaire de ", card, `. ${charges} utilisations.`], { charges })
    }


    protected act({ battle, unit }: UnitContext): void {
        battle.giveCard(unit, this.card)
    }
}

export const THRUST_BOTTLE = new CardBottle("Bouteille d'estoc", THRUST, CARD_BOTTLE_CHARGES)
