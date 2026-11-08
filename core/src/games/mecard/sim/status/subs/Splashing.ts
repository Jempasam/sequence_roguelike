import type { Text } from "../../../../../semantic"
import type { Observer } from "../../base/Observable"
import { fading, polygonOf } from "../../battle/effects"
import type { UnitContext } from "../../battle/Action"
import { pour } from "../../potion/Potion"
import type { Dose } from "../../potion/Potion"
import { BaseStatus } from "../BaseStatus"
import { STATUS_LEVEL, familyType, statusVisual } from "../Status"
import type { StatusType } from "../Status"
import { doseVariants } from "../StatusVariants"
import type { DoseType } from "../StatusVariants"

/** How far a barrel splashes its potion when it breaks, in meters. */
export const SPLASH_RADIUS = 1.5

/** How long a splash shows, in seconds. */
const SPLASH_TIME = 0.4

/** A barrel full of a potion, which it splashes when it breaks. */
export const SPLASHING = familyType("tonneau", statusVisual("barrel", 0.75, 0.5, 0.3), "neutral", { description: ["À sa mort, verse sa potion sur chaque unité autour, au niveau ", STATUS_LEVEL, "."] })

/** The kinds of barrel, one for each dose. */
export const BARRELS = doseVariants(SPLASHING, dose => `${SPLASHING} (${dose.potion})`, (type, level) => new Splashing(type, level))

/** Splashing: when it dies, it pours its potion on every unit around it, at its level. A barrel holds it. */
export class Splashing extends BaseStatus {


    constructor(
        public readonly type: DoseType,
        level: number,
    ){
        super(level)
    }


    /** The potion it splashes. */
    public get dose(): Dose { return this.type.dose }

    public override toString(): string { return `${SPLASHING} (${this.dose.potion})` }

    public override toSemString(): Text { return [SPLASHING, " (", this.dose.potion, ")"] }

    public init({ battle, unit }: UnitContext): void {
        this.#observer = unit.onDeath.add(() => {
            const area = { kind: "circle", center: unit.position, radius: SPLASH_RADIUS } as const
            battle.signals.notifyStatus.notify({ unit, status: this })
            battle.post(fading(SPLASH_TIME, [polygonOf(area, { ...this.dose.potion.color, a: 0.5 })]))
            battle.events.push({ type: "status", unit, text: ["éclabousse ", this.dose.potion] })
            const level = this.dose.sign * this.level
            for(const target of battle.unitsIn(area)) pour(battle, this.dose, target, level)
        })
    }

    public remove(): void {
        this.#observer?.remove()
    }


    #observer?: Observer
}

/** The kind of a barrel of a dose. */
export function barrelOf(dose: Dose): StatusType { return BARRELS.of(dose) }
