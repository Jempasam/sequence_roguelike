import type { UnitContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"

/**
 * A unit anchored to a spirit: as the round ends, it blinks to where the spirit stands and faces it, and the
 * spirit is gone.
 */
export class SpiritAnchor extends AbstractProcess {


    constructor(
        /** The spirit it goes back to. */
        public readonly spirit: Unit,
    ){
        super("ancre spirituelle", visual("processes/spirit_anchor", { color: [0.6, 0.85, 1] }))
    }


    public dispose({ battle, unit }: UnitContext): void {
        const { spirit } = this
        if(unit.alive && battle.phase !== "over" && spirit.alive){
            if(!battle.blink(unit, spirit.position) && battle.leap(unit, spirit.position)) battle.unblock(unit)
            battle.turn(unit, spirit.direction)
        }
        battle.vanish(spirit)
    }
}
