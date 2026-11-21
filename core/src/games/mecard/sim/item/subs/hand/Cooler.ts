import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"

import { AbstractItem } from "../AbstractItem"

/** A cooler: at the start of each battle, each usable of its unit gains a charge. */
export class Cooler extends AbstractItem {


    constructor(){
        super("Glacière", visual("items/cooler"), ["Début du combat : chacun de tes usables gagne 1 charge."])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        // At the first round, after the usables that refill were filled again.
        hold(battle.roundStarted.add(round => {
            if(round !== 1) return
            for(const carried of unit.usables) carried.charges++
        }))
    }
}

export const COOLER = new Cooler()
