import { Add, ModifierKey } from "../../../base/Attribute"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"

import { AbstractItem } from "../AbstractItem"
import { BATTLE_ROUND, UNIT } from "../../../base/keywords"
import { INFLICTED } from "../../../battle/mecanic/inflict/keyword"
import * as Inflict from "../../../battle/mecanic/inflict"

/** How much strength and precision a compass gives at most, for a round. */
const COMPASS_MAX = 3

/** A mad compass: each wound its unit inflicts adds a point of strength and of precision, for the round. */
export class MadCompass extends AbstractItem {


    constructor(
        /** How many points it gives at most in a round. */
        public readonly most: number,
    ){
        super("Boussole affolée", visual("items/mad_compass"), [
            "Chaque fois que tu ", INFLICTED.as("infliges"), " des dégâts à une ", UNIT,
            " : +1 force et +1 précision jusqu'à la fin du ", BATTLE_ROUND, " (", most, " au plus).",
        ])
    }


    public init({ battle, unit, hold }: PlugContext): void {
        const key = new ModifierKey(this.name)
        const { strength, precision } = unit.stats
        let points = 0
        const clear = (): void => {
            points = 0
            strength.remove(key)
            precision.remove(key)
        }
        hold(battle.signals.damaged.add(() => {
            if(!Inflict.isInflictedBy(battle, unit) || points >= this.most) return
            points++
            strength.add(key, new Add(points))
            precision.add(key, new Add(points))
        }))
        hold(battle.roundEnded.add(clear))
        hold(clear)
    }
}

export const MAD_COMPASS = new MadCompass(COMPASS_MAX)
