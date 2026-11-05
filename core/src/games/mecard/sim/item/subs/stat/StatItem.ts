import type { Text } from "../../../../../../semantic"
import { Add, ModifierKey } from "../../../base/Attribute"
import type { Attribute } from "../../../base/Attribute"
import type { PlugContext } from "../../../battle/Action"
import type { UnitStats } from "../../../battle/Unit"

import { AbstractItem } from "../AbstractItem"

/** An item adding to a stat of its unit for the whole battle. Each item says which stat. */
export abstract class StatItem extends AbstractItem {


    constructor(
        name: string, description: Text,

        /** What it adds to the stat. */
        public readonly bonus: number,
    ){
        super(name, description)
    }


    /** The stat it adds to. */
    public abstract stat(stats: UnitStats): Attribute<number>

    // The modifier goes under a key of its own, made at each init, so two copies of an item stack.
    public init({ unit, hold }: PlugContext): void {
        const stat = this.stat(unit.stats)
        const key = new ModifierKey(this.name)
        stat.add(key, new Add(this.bonus))
        hold(() => stat.remove(key))
    }
}
