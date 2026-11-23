import type { PlugContext } from "../../../battle/Action"
import { visual } from "../../../base/Visual"
import { BUBBLE, BULLE, SOAPY } from "../../../status/subs/BubbleStatuses"

import { AbstractItem } from "../AbstractItem"
import { BATTLE_ROUND } from "../../../base/keywords"

/** The level of bubble the bearer starts a battle at, and gains at the start of each round. */
export const BUBBLE_BODY_START = 3
export const BUBBLE_BODY_ROUND = 1

/** How near a unit must stand to be made soapy by the bearer, in meters. */
export const BUBBLE_BODY_REACH = 2

/**
 * A body of bubble: the bearer is one. It starts a battle at some level of bubble and gains one at the start of
 * each round, and after each action it plays, every unit near it is made soapy for a round at least. Each one
 * adds its levels to the ones of the others.
 */
export class BubbleBody extends AbstractItem {


    constructor(){
        super("Corps de bulle", visual("items/bubble_body"), [
            "Celui qui le porte devient une ", BULLE.as("bulle"), " : de niveau ", BUBBLE_BODY_START, " au début du combat, et +",
            BUBBLE_BODY_ROUND, " à chaque début de ", BATTLE_ROUND, ". Après chacune de ses actions, chaque unité à moins de ",
            BUBBLE_BODY_REACH, " m devient ", SOAPY, " au moins 1 ", BATTLE_ROUND, ".",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        battle.applyStatus(unit, BUBBLE, BUBBLE_BODY_START)
        hold(battle.roundStarted.add(() => battle.applyStatus(unit, BUBBLE, BUBBLE_BODY_ROUND)))
        hold(unit.stepEnded.add(() => {
            for(const other of battle.living){
                if(other === unit || other.position.distance(unit.position) > BUBBLE_BODY_REACH) continue
                const gap = 1 - (other.statusOf(SOAPY)?.level ?? 0)
                if(gap > 0) battle.applyStatus(other, SOAPY, gap)
            }
        }))
    }
}

export const BUBBLE_BODY = new BubbleBody()
