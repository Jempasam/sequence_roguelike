import { Add, ModifierKey } from "../../../base/Attribute"
import { visual } from "../../../base/Visual"
import type { PlugContext } from "../../../battle/Action"

import { AbstractItem } from "../AbstractItem"

/** How much strength and precision a compass gives at most, for a round. */
const COMPASS_MAX = 3

/** A mad compass: each unit hurt during an action of its unit adds a point of strength and of precision, for the round. */
export class MadCompass extends AbstractItem {


    constructor(
        /** How many points it gives at most in a round. */
        public readonly most: number,
    ){
        super("Boussole affolée", visual("items/mad_compass"), [
            "Chaque fois qu'une unité subit des dégâts pendant une de tes actions : +1 force et +1 précision jusqu'à la fin du round (", most, " au plus).",
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
            if(battle.actor !== unit || points >= this.most) return
            points++
            strength.add(key, new Add(points))
            precision.add(key, new Add(points))
        }))
        hold(battle.roundEnded.add(clear))
        hold(clear)
    }
}

export const MAD_COMPASS = new MadCompass(COMPASS_MAX)
