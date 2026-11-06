import type { ImagePath } from "../../../../../../engine/assets/Assets"
import type { UnitContext } from "../../../battle/Action"
import { gives } from "../../../card/Card"
import { ELEMENT, POTION } from "../../../card/CardType"
import type { CardType } from "../../../card/CardType"

import { DrawnItem } from "./DrawnItem"
import { CARTE, DECK } from "../../../base/keywords"

/**
 * A bag of a type of card: after each draw, when the hand holds no card giving the type, one drawn at
 * random from the deck among those that give it, when the hand has room.
 */
export class CardBag extends DrawnItem {


    constructor(
        name: string, icon: ImagePath,

        /** The type of the cards it fetches: what they give. */
        public readonly type: CardType<unknown>,
    ){
        super(name, icon, [
            "Après la pioche, sans ", CARTE, " de type ", type.name, " en main, en tire une au hasard du ", DECK, ".",
        ])
    }


    protected drawn({ battle, unit }: UnitContext): void {
        if(unit.hand.some(card => gives(card, this.type))) return
        if(unit.hand.length >= unit.stats.handSize.value) return
        const fitting = unit.decks.all.flatMap((deck, index) => {
            return deck.pile.filter(card => gives(card, this.type)).map(card => ({ card, deck: index }))
        })
        const chosen = battle.rng.pick(fitting)
        if(!chosen) return
        const { card, deck } = chosen
        unit.decks.take(deck, unit.decks.all[deck].pile.indexOf(card))
        battle.giveCard(unit, card, deck)
    }
}

export const POTION_BAG = new CardBag("Sac de potions", "mecard/items/potion_bag.png", POTION)
export const ELEMENT_BAG = new CardBag("Sac d'éléments", "mecard/items/element_bag.png", ELEMENT)
