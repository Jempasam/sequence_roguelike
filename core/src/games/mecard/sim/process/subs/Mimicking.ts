import type { PlugContext } from "../../battle/Action"
import type { Unit } from "../../battle/Unit"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"
import * as Steps from "../../battle/mecanic/step"

import { echoOf, isEcho } from "./echo"
import { tieTo } from "./Links"

/**
 * A nerf stuck to a unit until the end of the round: each action the unit it was shot by plays, the unit
 * it sticks to plays too, at its next step, from where it stands and facing as it does. Over once it dies.
 */
export class Mimicking extends AbstractProcess {


    constructor(
        /** The unit whose steps are copied. */
        public readonly target: Unit,
    ){
        super("exo-nerf", visual("processes/exo_nerf", { color: [0.95, 0.55, 0.2] }),
            "Chaque action de l'unité qui l'a lancé, l'unité touchée la joue aussi, à son prochain pas, de là où elle est.",
        )
    }


    public override init(ctx: PlugContext): void {
        const { battle, unit, hold } = ctx
        const { target } = this
        tieTo(ctx, target, this, "tethers/grapple")
        hold(unit.actionRead.add(() => {
            // The action starting is the last the unit played, put there before it is told.
            const action = unit.stepsPlayed[unit.stepsPlayed.length - 1]
            if(!action || isEcho(action) || !target.alive) return
            Steps.insert(battle, target, [echoOf(action)], { word: "exo-nerf" })
        }))
    }
}
