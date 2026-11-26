import type { PlugContext } from "../../battle/Action"
import type { Preview } from "../../battle/preview/Preview"
import type { PreviewContext } from "../../battle/preview/PreviewContext"
import * as Previews from "../../battle/preview/Previews"
import { MOVE_WIDTH } from "../../battle/previewColors"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"
import { BATTLE_ROUND } from "../../base/keywords"
import { WALK } from "../../battle/mecanic/walk/keyword"
import * as Walk from "../../battle/mecanic/walk"

/** A ride for the round: the unit goes some way ahead before each of its steps, and once at the start. */
export class Riding extends AbstractProcess {


    constructor(
        /** How far it goes each time, in meters, before the move factor of the unit. */
        public readonly length: number,
    ){
        super("cheval", visual("processes/horse", { color: [0.75, 0.55, 0.35] }),
            [WALK.as("Avance"), " tout droit au début du ", BATTLE_ROUND, ", puis avant chacun de ses pas."],
        )
    }


    public override init({ battle, unit, hold }: PlugContext): void {
        const ride = (): void => {
            Walk.move(battle, unit, unit.direction, this.length * unit.stats.move.value)
        }
        ride()
        hold(unit.stepStarted.add(ride))
    }

    /** One ride straight ahead, with nothing in the way. */
    public preview({ unit, pose }: PreviewContext): Preview {
        const to = pose.position.plus(pose.direction.times(this.length * unit.stats.move.value))
        return Previews.still(pose, ...Previews.moving(unit, pose.position, to, to, MOVE_WIDTH))
    }
}
