import { Add, ModifierKey } from "../../base/Attribute"
import { rgba } from "../../base/Rgba"
import type { PlugContext } from "../../battle/Action"
import { AbstractProcess } from "../AbstractProcess"

/** Strength for the round: hearts added to each blow of the unit, until the round ends. */
export class Strength extends AbstractProcess {


    constructor(
        /** How many hearts it adds to each blow. */
        public readonly bonus: number,
    ){
        super(`force +${bonus}`, "strength", rgba(1, 0.45, 0.3))
    }


    public override init({ unit, hold }: PlugContext): void {
        const key = new ModifierKey("force")
        unit.stats.strength.add(key, new Add(this.bonus))
        hold(() => unit.stats.strength.remove(key))
    }
}
