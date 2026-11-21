import type { Text } from "../../../../../semantic"
import type { UnitContext } from "../../battle/Action"
import { pour } from "../../potion/Potion"
import type { Dose } from "../../potion/Potion"
import { BaseStatus } from "../BaseStatus"
import { STATUS_LEVEL, familyType, statusVisual } from "../Status"
import type { StatusType } from "../Status"
import { doseVariants } from "../StatusVariants"
import type { DoseType } from "../StatusVariants"

/** Soaked with a potion: the blows pour it, for as long as the unit lives. */
export const SOAKED = familyType("mouillé", statusVisual("coated", 0.45, 0.7, 0.95), "positive", {
    description: [
        "Chaque attaque qui touche verse sa potion sur sa cible, au niveau ", STATUS_LEVEL,
        " (inversée pour un antidote).",
    ],
})

/** The kinds of soaking, one for each dose. */
export const SOAKS = doseVariants(SOAKED, dose => `${SOAKED} (${dose.potion})`, (type, level) => {
    return new Soaked(type, level)
})

/**
 * Soaked: each of its attacks that lands pours its potion on what it hit, at its level, turned around when
 * the dose is an antidote. Unlike a coat, it never wears off.
 */
export class Soaked extends BaseStatus {


    constructor(
        public readonly type: DoseType,
        level: number,
    ){
        super(level)
    }


    /** The potion it pours. */
    public get dose(): Dose { return this.type.dose }

    public override toString(): string { return `${SOAKED} (${this.dose.potion})` }

    public override toSemString(): Text { return [SOAKED, " (", this.dose.potion, ")"] }

    public init({ battle, unit }: UnitContext): void {
        this.keep(unit.hitting.add(({ target }) => {
            pour(battle, this.dose, target, this.dose.sign * this.level)
        }))
    }

    public remove(): void {
        this.letGo()
    }
}

/** The kind of soaking of a dose. */
export function soakOf(dose: Dose): StatusType { return SOAKS.of(dose) }
