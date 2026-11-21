import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import type { Card } from "../../../card/Card"
import { MergedCard, mergeable } from "../../../card/subs/composite/MergedCard"
import { RandomCard } from "../../../card/subs/composite/RandomCard"

import { AbstractItem } from "../AbstractItem"

/** What a card of chance becomes: its cards merged when they can be, else both of them, one after the other. */
function resolved(card: RandomCard): Card[] {
    return mergeable(card.contents) ? [new MergedCard(card.contents, { name: card.name, rarity: card.rarity })] : [...card.contents]
}

/** A loaded die: every card of chance of the chain plays both its cards instead of one, merged when it can. */
export class LoadedDie extends AbstractItem {


    constructor(){
        super("Dé pipé", visual("items/loaded_die"), [
            "À la préparation, chaque carte Hasard est remplacée par un mélange de ses deux cartes, ou à défaut par les deux à la suite.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(unit.onPreparing.add(() => {
            const { chain } = unit
            // From the end, so a card replaced by two does not shift the places yet to see.
            for(let index = chain.cards.length - 1; index >= 0; index--){
                const card = chain.cards[index]
                if(card instanceof RandomCard) battle.replaceInChain(unit, index, 1, resolved(card))
            }
        }))
    }
}

export const LOADED_DIE = new LoadedDie()
