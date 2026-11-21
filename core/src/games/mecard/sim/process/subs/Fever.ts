import { Add, ModifierKey } from "../../base/Attribute"
import { visual } from "../../base/Visual"
import type { PlugContext } from "../../battle/Action"
import { AbstractProcess } from "../AbstractProcess"

/** A fever: strength and precision for the round, as many as the bad statuses its unit holds. */
export class Fever extends AbstractProcess {


    constructor(
        /** How many points of each it gives. */
        public readonly bonus: number,
    ){
        super(`fièvre +${bonus}`, visual("processes/fever"),
            `Force et précision accrues de ${bonus} pour le round.`,
        )
    }


    public override init({ unit, hold }: PlugContext): void {
        const key = new ModifierKey("fièvre")
        unit.stats.strength.add(key, new Add(this.bonus))
        unit.stats.precision.add(key, new Add(this.bonus))
        hold(() => {
            unit.stats.strength.remove(key)
            unit.stats.precision.remove(key)
        })
    }
}
