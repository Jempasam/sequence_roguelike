import type { Text } from "../../../../../semantic"
import { ModifierKey, Multiply } from "../../base/Attribute"
import type { Observer } from "../../base/Observable"
import { counted } from "../../battle/words"
import type { UnitContext } from "../../battle/Action"
import { BaseStatus } from "../BaseStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"

/** A root: the unit cannot move on its own. */
export const ROOTED = new StatusType("racines", statusVisual("rooted", 0.45, 0.8, 0.3), "negative", level => new Rooted(level), { description: ["Ses ", STATUS_LEVEL, " prochains pas ne peuvent pas le déplacer, mais il agit encore."] })

/** Rooted: the next steps of the unit cannot move it, though it still acts. Its level: the steps left. */
export class Rooted extends BaseStatus {


    public readonly type: StatusType = ROOTED

    public override toString(): string { return `${ROOTED} ${counted(this.level, "étape")}` }

    public override toSemString(): Text { return [ROOTED, ` ${counted(this.level, "étape")}`] }

    public init({ battle, unit }: UnitContext): void {
        unit.stats.mobility.add(this.#key, new Multiply(0))
        this.#observer = unit.stepEnded.add(() => {
            this.setLevel(this.level - 1)
            if(this.level <= 0) battle.removeStatus(unit, ROOTED)
        })
    }

    public remove({ unit }: UnitContext): void {
        unit.stats.mobility.remove(this.#key)
        this.#observer?.remove()
    }


    readonly #key = new ModifierKey("racines")
    #observer?: Observer
}
