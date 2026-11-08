import type { Text } from "../../../../../semantic"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { pour } from "../../potion/Potion"
import type { Dose } from "../../potion/Potion"
import { BaseStatus } from "../BaseStatus"
import { STATUS_LEVEL, familyType, statusVisual } from "../Status"
import type { StatusType } from "../Status"
import { doseVariants } from "../StatusVariants"
import type { DoseType } from "../StatusVariants"

/** A coated blade: the blows pour a potion. */
export const COATED = familyType("lame enduite", statusVisual("coated", 0.6, 0.85, 0.75), "positive", { description: ["Jusqu'à la fin du round, chaque attaque qui touche verse sa potion sur sa cible, au niveau ", STATUS_LEVEL, " (inversée pour un antidote)."] })

/** The kinds of coat, one for each dose. */
export const COATS = doseVariants(COATED, dose => `${COATED} (${dose.potion})`, (type, level) => new Coated(type, level))

/**
 * Coated: until the end of the round, each of its attacks that lands pours its potion on what it hit, at its
 * level, turned around when the dose is an antidote.
 */
export class Coated extends BaseStatus {


    constructor(
        public readonly type: DoseType,
        level: number,
    ){
        super(level)
    }


    /** The potion it pours. */
    public get dose(): Dose { return this.type.dose }

    public override toString(): string { return `${COATED} (${this.dose.potion})` }

    public override toSemString(): Text { return [COATED, " (", this.dose.potion, ")"] }

    public init({ battle, unit }: UnitContext): void {
        this.#observers.push(
            unit.hitting.add(({ target }) => pour(battle, this.dose, target, this.dose.sign * this.level)),
            battle.roundEnded.add(() => battle.removeStatus(unit, this.type)),
        )
    }

    public remove(): void {
        for(const observer of this.#observers) observer.remove()
        this.#observers.length = 0
    }


    readonly #observers: Observer[] = []
}

/** The kind of a coat of a dose. */
export function coatOf(dose: Dose): StatusType { return COATS.of(dose) }
