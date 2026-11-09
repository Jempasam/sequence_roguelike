import type { PlugContext } from "../../battle/Action"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"

/** A ride for the round: the unit goes some way ahead before each of its steps, and once at the start. */
export class Riding extends AbstractProcess {


    constructor(
        /** How far it goes each time, in meters, before the move factor of the unit. */
        public readonly length: number,
    ){
        super("cheval", visual("processes/horse", { color: [0.75, 0.55, 0.35] }),
            "Avance tout droit au début du round, puis avant chacun de ses pas.",
        )
    }


    public override init({ battle, unit, hold }: PlugContext): void {
        const ride = (): void => {
            battle.move(unit, unit.direction, this.length * unit.stats.move.value)
        }
        ride()
        hold(unit.stepStarted.add(ride))
    }
}
