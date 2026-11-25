import { Add, ModifierKey } from "../../../base/Attribute"
import { FORCE, PRECISION } from "../../../base/keywords"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"

import { AbstractItem } from "../AbstractItem"

/** How many levels of status it takes, all of them together, for each point of strength and precision. */
const LEVELS_PER_POINT = 4

/** A breathalyzer: a point of strength and of precision for each few levels of status its unit holds. */
export class Breathalyzer extends AbstractItem {


    constructor(){
        super("Éthylotest", visual("items/breathalyzer"), [
            "+", 1, " ", FORCE, " et +", 1, " ", PRECISION, ` tous les ${LEVELS_PER_POINT} niveaux de status.`,
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        const key = new ModifierKey(this.name)
        const refresh = (): void => {
            let levels = 0
            for(const status of unit.statuses.values()) levels += Math.max(0, status.level)
            const points = Math.floor(levels / LEVELS_PER_POINT)
            for(const stat of [unit.stats.strength, unit.stats.precision]){
                if(points > 0) stat.add(key, new Add(points))
                else stat.remove(key)
            }
        }
        const told = (held: { unit: unknown }): void => {
            if(held.unit === unit) refresh()
        }
        refresh()
        hold(battle.signals.statusAdded.add(told))
        hold(battle.signals.statusLeveled.add(told))
        hold(battle.signals.statusRemoved.add(told))
        hold(() => {
            unit.stats.strength.remove(key)
            unit.stats.precision.remove(key)
        })
    }
}

export const BREATHALYZER = new Breathalyzer()
