import type { Visual } from "../../../base/Visual"
import { concat, joinText } from "../../../../../../semantic"
import type { Text } from "../../../../../../semantic"
import { Add, ModifierKey } from "../../../base/Attribute"
import type { Attribute } from "../../../base/Attribute"
import type { PlugContext } from "../../../battle/Action"
import type { UnitStats } from "../../../battle/Unit"
import { frenchNumber } from "../../../battle/words"

import { AbstractItem } from "../AbstractItem"

/** What an item adds to one stat of its unit. */
export interface StatChange {

    /** The stat it adds to. */
    readonly stat: (stats: UnitStats) => Attribute<number>

    /** What it adds to the stat. */
    readonly amount: number

    /** The stat, as said after the amount: `cartes de pioche`. */
    readonly text: Text

    /** The amount as said in the text, when the number alone does not tell it: a heart count, a percentage. */
    readonly shown?: Text
}

/** An item adding to some stats of its unit for the whole battle, described from what it adds. */
export class StatItem extends AbstractItem {


    constructor(
        name: string, icon: Visual,

        /** What it adds, to as many stats as it lists. */
        public readonly changes: readonly StatChange[],
    ){
        super(name, icon, joinText(
            changes.map(change => concat("+", change.shown ?? frenchNumber(change.amount), " ", change.text)),
            ", ",
        ))
    }


    // Each modifier goes under a key of its own, made at each init, so two copies of an item stack.
    public init({ unit, hold }: PlugContext): void {
        for (const change of this.changes) {
            const stat = change.stat(unit.stats)
            const key = new ModifierKey(this.name)
            stat.add(key, new Add(change.amount))
            hold(() => stat.remove(key))
        }
    }
}
