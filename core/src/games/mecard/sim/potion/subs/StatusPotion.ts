import type { Text } from "../../../../../semantic"
import { colored } from "../../base/Rgba"
import type { Rgba } from "../../base/Rgba"
import type { Battle } from "../../battle/Battle"
import type { Unit } from "../../battle/Unit"
import type { StatusType } from "../../status/Status"
import type { Potion } from "../Potion"

/**
 * A potion putting a status on at the level of the potion, or taking that many levels off when turned around.
 */
export class StatusPotion implements Potion {


    public readonly color: Rgba

    constructor(
        public readonly name: string,
        public readonly description: Text,

        /** The kind of status it puts on, which it is named and colored after. */
        public readonly type: StatusType,
    ){
        this.color = type.color
    }


    public apply(battle: Battle, target: Unit, level: number): void {
        battle.applyStatus(target, this.type, level)
    }

    public toString(): string { return this.name }

    public toSemString(): Text { return colored(this.color, this.name) }
}
