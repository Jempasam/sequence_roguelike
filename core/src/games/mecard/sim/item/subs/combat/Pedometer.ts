import { Add, ModifierKey } from "../../../base/Attribute"
import type { Attribute } from "../../../base/Attribute"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"

import { AbstractItem } from "../AbstractItem"
import { RELOCATED } from "../../../battle/mecanic/relocation/signals"

/** How far a unit must walk for each step of the strength and the agility, in meters. */
const STRIDE_PERIOD = 10

/** How far a unit must walk for each point of precision, in meters. */
const AIM_PERIOD = 20

/** What each period of walking gives. */
const STRENGTH_PER_PERIOD = 1
const AGILITY_PER_PERIOD = 0.5
const PRECISION_PER_PERIOD = 1

/** A pedometer: the farther its unit walks in a battle, the stronger, the faster and the surer it is. */
export class Pedometer extends AbstractItem {


    constructor(){
        super("Podomètre", visual("items/pedometer"), [
            `Tous les ${STRIDE_PERIOD} m parcourus : +${STRENGTH_PER_PERIOD} force et +${AGILITY_PER_PERIOD} agilité. `,
            `Tous les ${AIM_PERIOD} m : +${PRECISION_PER_PERIOD} précision. Jusqu'à la fin du combat.`,
        ])
    }


    public init({ unit, hold }: PlugContext): void {
        const key = new ModifierKey(this.name)
        const give = (stat: Attribute<number>, amount: number): void => {
            if(amount > 0) stat.add(key, new Add(amount))
        }
        const { strength, move, precision } = unit.stats
        let walked = 0
        hold(unit.observers.of(RELOCATED).add(({ from, to }) => {
            // Only the strides of its own: what others do to it is not walked.
            if(unit.shoving) return
            walked += from.distance(to)
            const strides = Math.floor(walked / STRIDE_PERIOD)
            give(strength, strides * STRENGTH_PER_PERIOD)
            give(move, strides * AGILITY_PER_PERIOD)
            give(precision, Math.floor(walked / AIM_PERIOD) * PRECISION_PER_PERIOD)
        }))
        hold(() => {
            strength.remove(key)
            move.remove(key)
            precision.remove(key)
        })
    }
}

export const PEDOMETER = new Pedometer()
