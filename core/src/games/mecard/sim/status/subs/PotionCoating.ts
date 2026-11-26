import type { Text } from "../../../../../semantic"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { levelOf, pour } from "../../potion/Potion"
import type { Dose } from "../../potion/Potion"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, familyType, statusVisual } from "../Status"
import type { StatusType } from "../Status"
import { doseVariants } from "../StatusVariants"
import type { DoseType } from "../StatusVariants"
import { BATTLE_ROUND } from "../../base/keywords"
import { COLLIDED } from "../../battle/mecanic/walk/signals"

/** A potion coating: the body pours a potion on what it touches. */
export const POTION_COATING = familyType("enrobage de potion", statusVisual("coated", 0.6, 0.85, 0.75), "positive", {
    description: ["Au contact d'une unité, verse sa potion sur celle-ci (inversée pour un antidote). Dure encore ", STATUS_LEVEL, " ", BATTLE_ROUND.as("rounds"), "."],
})

/** The kinds of potion coating, one for each dose. */
export const POTION_COATINGS = doseVariants(
    POTION_COATING, dose => `${POTION_COATING} (${dose.potion})`, (type, level) => new PotionCoatingStatus(type, level),
)

/**
 * A potion coating: while it lasts, each time its unit touches another, whoever moves, its potion is poured
 * on the other, as strong as a thrown potion of the unit that made it.
 */
export class PotionCoatingStatus extends RoundStatus {


    constructor(
        public readonly type: DoseType,
        level: number,
    ){
        super(level)
    }


    /** The potion it pours. */
    public get dose(): Dose { return this.type.dose }

    public override toString(): string { return `${POTION_COATING} (${this.dose.potion})` }

    public override toSemString(): Text { return [POTION_COATING, " (", this.dose.potion, ")"] }

    protected plug({ battle, unit }: UnitContext): Observer[] {
        return [
            battle.observers.of(COLLIDED).add(({ unit: mover, struck }) => {
                const other = mover === unit ? struck : struck === unit ? mover : null
                if(other?.alive) pour(battle, this.dose, other, levelOf(this.dose, unit.owner ?? unit))
            }),
        ]
    }
}

/** The kind of a potion coating of a dose. */
export function potionCoatingOf(dose: Dose): StatusType { return POTION_COATINGS.of(dose) }
