import type { PlugContext } from "../../../battle/Action"
import type { Card } from "../../../card/Card"
import { gives } from "../../../card/Card"
import { BEAST } from "../../../card/CardType"

import { AbstractItem } from "../AbstractItem"
import { CARTE, DECK } from "../../../base/keywords"
import { visual } from "../../../base/Visual"

/** How many cards taking nothing and giving a beast it wants in the hand. */
const BEASTS_WANTED = 2

/** Is a card one taking nothing and giving a beast? */
function isBeastSource(card: Card): boolean {
    return card.input === null && gives(card, BEAST)
}

/**
 * A crown of flowers: at the end of the round, when the hand holds fewer than {@link BEASTS_WANTED} cards
 * taking nothing and giving a beast, one drawn at random from the deck or its discard, when the hand has room.
 */
export class FlowerCrown extends AbstractItem {


    constructor(){
        super("Couronne de fleurs", visual("items/flower_crown"), [
            "Fin de tour, avec moins de ", String(BEASTS_WANTED), " ", CARTE, "s rien : bête en main, en ajoute une au hasard du ",
            DECK, " ou de la défausse.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.roundEnded.add(() => {
            if(!unit.alive) return
            if(unit.hand.filter(isBeastSource).length >= BEASTS_WANTED) return
            // Checked before taking anything: a card taken out of the decks with no room is lost.
            if(unit.hand.length >= unit.stats.handSize.value) return
            const fitting = unit.decks.all.flatMap(deck => {
                return [...deck.pile, ...deck.discard].filter(isBeastSource)
            })
            const card = battle.rng.pick(fitting)
            if(!card) return
            const deck = unit.decks.takeCard(card)
            if(deck === null) return
            battle.giveCard(unit, card, deck)
        }))
    }
}

export const FLOWER_CROWN = new FlowerCrown()
