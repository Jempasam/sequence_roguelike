import { ModifierKey, Multiply } from "../../base/Attribute"
import { rgba } from "../../base/Rgba"
import type { PlugContext } from "../../battle/Action"
import { AbstractProcess } from "../AbstractProcess"

/** Quickness for the round: the moves of the unit go farther, until the round ends. */
export class Haste extends AbstractProcess {


    constructor(
        /** The factor it puts on the agility of the unit. */
        public readonly factor: number,
    ){
        super("hâte", "haste", rgba(1, 0.95, 0.3))
    }


    public override init({ unit, hold }: PlugContext): void {
        const key = new ModifierKey("hâte")
        unit.stats.move.add(key, new Multiply(this.factor))
        hold(() => unit.stats.move.remove(key))
    }
}
