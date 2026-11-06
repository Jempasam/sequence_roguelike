import { rgba } from "../../base/Rgba"
import type { PlugContext } from "../../battle/Action"
import { AbstractProcess } from "../AbstractProcess"

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
        super("dissipation", "vanishing", rgba(0.7, 0.8, 0.95))
    }


    public override init({ battle, unit }: PlugContext): void {
        const observer = battle.roundEnding.add(() => {
            observer.remove()
            battle.vanish(unit)
        })
    }
}
