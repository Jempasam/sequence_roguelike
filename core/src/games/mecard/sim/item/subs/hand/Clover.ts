import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import { chaosCard } from "../../../catalog/cards"

import { AbstractItem } from "../AbstractItem"

/** How many cards of chaos the clover of the catalog gives at the start of a battle. */
const CLOVER_CARDS = 2

/** A four leaf clover: the battle starts with fleeting cards of chaos in the hand. */
export class Clover extends AbstractItem {


    constructor(
        /** How many cards of chaos it gives. */
        public readonly cards: number,
    ){
        super("Trèfle à quatre feuilles", visual("items/clover"), ["Début du combat : reçois ", cards, " cartes Chaos éphémères."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundStarted.add(round => {
            if(round !== 1) return
            for(let each = 0; each < this.cards; each++) battle.giveFleetingCard(unit, chaosCard())
        }))
    }
}

export const CLOVER = new Clover(CLOVER_CARDS)
