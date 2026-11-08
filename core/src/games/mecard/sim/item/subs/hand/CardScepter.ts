import type { Visual } from "../../../base/Visual"
import type { UnitContext } from "../../../battle/Action"
import type { Card } from "../../../card/Card"
import { DODGE_CARD } from "../../../card/subs/combat/DodgeCard"

import { DrawnItem } from "./DrawnItem"
import { visual } from "../../../base/Visual"

/** A scepter of a card: a copy of it in hand after each draw, when the hand holds none and has room. */
export class CardScepter extends DrawnItem {


    constructor(
        name: string, icon: Visual,

        /** The card it gives. */
        public readonly card: Card,
    ){
        super(name, icon, ["Après la pioche, sans ", card, " en main, en donne un exemplaire."])
    }


    protected drawn({ battle, unit }: UnitContext): void {
        if(unit.hand.includes(this.card)) return
        battle.giveCard(unit, this.card)
    }
}

export const DODGE_SCEPTER = new CardScepter("Sceptre d'esquive", visual("items/dodge_scepter"), DODGE_CARD)
