import type { PlugContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { AbstractProcess } from "../AbstractProcess"
import { echoOf, isEcho } from "./echo"
import { visual } from "../../base/Visual"

/**
 * An echo of a unit, until the end of the round: the next action it plays, the unit playing this plays too,
 * at its next step, from where it stands. Once repeated, or once the unit is dead, it is over.
 */
export class Parroting extends AbstractProcess {


    constructor(
        /** The unit whose next action is repeated. */
        public readonly target: Unit,
    ){
        super("perroquet", visual("processes/parrot", { color: [0.4, 0.85, 0.5] }),
            "La prochaine action de l'unité visée, tu la joues aussi, à ton prochain pas.",
        )
    }


    public override init({ battle, unit, hold }: PlugContext): void {
        const { target } = this
        hold(target.actionRead.add(() => {
            // The action starting is the last it has played, put there before it is told.
            const action = target.stepsPlayed[target.stepsPlayed.length - 1]
            if(action && !isEcho(action)){
                unit.steps.unshift(echoOf(action))
                battle.events.push({ type: "status", unit, text: "perroquet" })
            }
            battle.endProcess(unit, this)
        }))
        hold(target.onDeath.add(() => battle.endProcess(unit, this)))
    }
}
