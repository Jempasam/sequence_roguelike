import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"

import { AbstractItem } from "../AbstractItem"

/** A testament: when its unit dies, its chain is added to the end of the chain of the ally nearest to it. */
export class Testament extends AbstractItem {


    constructor(){
        super("Testament", visual("items/testament"), [
            "À ta mort, ta chaîne est ajoutée à la fin de la chaîne de l'allié le plus proche.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        hold(battle.unitDied.add(({ unit: dead }) => {
            if(dead !== unit) return
            const heir = battle.nearestAlly(unit)
            if(heir) battle.appendToChain(heir, [...unit.chain.cards])
        }))
    }
}

export const TESTAMENT = new Testament()
