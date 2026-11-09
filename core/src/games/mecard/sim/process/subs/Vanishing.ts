import type { PlugContext } from "../../battle/Action"
import { AbstractProcess } from "../AbstractProcess"
import { visual } from "../../base/Visual"

/**
 * A unit that does not stay: as the round ends, it vanishes from the battle, whatever is left of its life.
 * A clone is one.
 *
 * @remarks
 * It listens to the end of the round itself rather than holding the listener: a unit that dies before has
 * its processes ended at once, and must vanish all the same.
 */
export class Vanishing extends AbstractProcess {


    constructor(){
        super("dissipation", visual("processes/vanishing", { color: [0.7, 0.8, 0.95] }),
            "Disparaît du combat à la fin du round, quelle que soit sa vie.",
        )
    }


    public override init({ battle, unit }: PlugContext): void {
        const observer = battle.roundEnding.add(() => {
            observer.remove()
            battle.vanish(unit)
        })
    }
}
