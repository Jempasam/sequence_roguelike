import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"
import { HeartCount } from "../../../battle/words"
import { Heart } from "../../../heart/Heart"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"

import { AbstractItem } from "../AbstractItem"
import { BATTLE_ROUND } from "../../../base/keywords"

/** How many shields the shell of the catalog holds at most. */
const SHELL_MAX = 3

/** A snail shell: each round spent without a move of its own adds a shield, and a move drops them all. */
export class SnailShell extends AbstractItem {


    constructor(
        /** How many shields it holds at most. */
        public readonly capacity: number,
    ){
        super("Coquille d'escargot", visual("items/snail_shell"), [
            "Un ", BATTLE_ROUND, " sans te déplacer te donne ", new HeartCount(1), " ", SHIELD_HEART, " (", capacity, " au plus). Un déplacement les perd.",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        let moved = false
        let shells = 0
        hold(unit.moved.add(() => {
            // What others do to it is no move of its own.
            if(unit.shoving) return
            moved = true
            if(shells <= 0) return
            unit.hearts.remove(SHIELD_HEART, shells, null)
            shells = 0
        }))
        hold(battle.roundEnded.add(() => {
            if(!moved && unit.alive && shells < this.capacity){
                unit.hearts.give(new Heart(SHIELD_HEART))
                shells++
            }
            moved = false
        }))
    }
}

export const SNAIL_SHELL = new SnailShell(SHELL_MAX)
