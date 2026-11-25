import type { PlugContext, UnitContext } from "../../battle/Action"
import type { Preview } from "../../battle/preview/Preview"
import type { PreviewContext } from "../../battle/preview/PreviewContext"
import * as Previews from "../../battle/preview/Previews"
import { MOVE_COLOR, MOVE_WIDTH } from "../../battle/previewColors"
import type { Unit } from "../../battle/Unit"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"
import { BATTLE_ROUND } from "../../base/keywords"

/**
 * A unit anchored to a spirit: as the round ends, it blinks to where the spirit stands and faces it, and the
 * spirit is gone.
 */
export class SpiritAnchor extends AbstractProcess {


    constructor(
        /** The spirit it goes back to. */
        public readonly spirit: Unit,
    ){
        super("ancre spirituelle", visual("processes/spirit_anchor", { color: [0.6, 0.85, 1] }),
            ["À la fin du ", BATTLE_ROUND, ", se téléporte à l'esprit et se tourne comme lui, puis l'esprit disparaît."],
        )
    }


    public override init({ battle, unit, hold }: PlugContext): void {
        hold(battle.tether(unit, this.spirit, visual("tethers/laser", { color: [0.6, 0.85, 1] })))
    }


    /** The blink back to the spirit at the end of the round, and the unit as it faces there. */
    public preview({ unit, pose }: PreviewContext): Preview {
        const { spirit } = this
        if(!spirit.alive) return Previews.still(pose)
        const to = spirit.position
        return Previews.still(
            pose,
            Previews.arrow([pose.position, to], MOVE_WIDTH, MOVE_COLOR),
            Previews.body(unit, to, spirit.direction),
        )
    }

    public dispose({ battle, unit }: UnitContext): void {
        const { spirit } = this
        if(unit.alive && battle.phase !== "over" && spirit.alive){
            if(!battle.teleport(unit, spirit.position) && battle.leap(unit, spirit.position)) battle.unblock(unit)
            battle.turn(unit, spirit.direction)
        }
        battle.vanish(spirit)
    }
}
