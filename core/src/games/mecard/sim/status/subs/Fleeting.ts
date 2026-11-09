import type { Text } from "../../../../../semantic"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { BaseStatus } from "../BaseStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { DamageType } from "../../battle/DamageType"

/** How many hearts a summoned body loses at the end of each round. */
export const FLEETING_DAMAGE = 1

/** What a summoned body is: it wears away. */
export const FLEETING = new StatusType("éphémère", statusVisual("fleeting", 0.8, 0.8, 0.7), "neutral", level => new Fleeting(level), { description: ["Perd un cœur à la fin de chaque round, pendant ", STATUS_LEVEL, " rounds."] })

/** Fleeting: a heart lost at the end of each round, for as long as it lasts. Summoned bodies are. */
export class Fleeting extends BaseStatus {


    public readonly type: StatusType = FLEETING

    public override toString(): string { return FLEETING.name }

    public override toSemString(): Text { return FLEETING }

    public init({ battle, unit }: UnitContext): void {
        this.#observer = battle.roundEnded.add(() => {
            unit.hearts.damage(FLEETING_DAMAGE, DamageType.ELEMENTAL, null)
        })
    }

    public remove(): void {
        this.#observer?.remove()
    }


    #observer?: Observer
}
