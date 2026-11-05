import type { Text } from "../../../../../semantic"
import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import { fading, polygonOf } from "../../battle/effects"
import type { UnitContext } from "../../battle/Action"
import { pour } from "../../potion/Potion"
import type { Dose } from "../../potion/Potion"
import { StatusType } from "../Status"
import type { Status } from "../Status"

/** How far a barrel splashes its potion when it breaks, in meters. */
export const SPLASH_RADIUS = 1.5

/** How long a splash shows, in seconds. */
const SPLASH_TIME = 0.4

/** A barrel full of a potion, which it splashes when it breaks. */
export const SPLASHING = new StatusType("tonneau", rgba(0.75, 0.5, 0.3), "neutral")

/** Splashing: when it dies, it pours a potion on every unit around it. A barrel holds it. */
export class Splashing implements Status {


    public readonly type = SPLASHING

    constructor(
        public readonly dose: Dose,

        /** The level it pours its potion at. */
        public readonly level: number,
    ){}


    public copy(): Splashing { return new Splashing(this.dose, this.level) }

    public toString(): string { return `${SPLASHING} (${this.dose.potion})` }

    public toSemString(): Text { return [SPLASHING, " (", this.dose.potion, ")"] }

    public init({ battle, unit }: UnitContext): void {
        this.#observer = unit.onDeath.add(() => {
            const area = { kind: "circle", center: unit.position, radius: SPLASH_RADIUS } as const
            battle.signals.notifyStatus.notify({ unit, status: this })
            battle.post(fading(SPLASH_TIME, [polygonOf(area, { ...this.dose.potion.color, a: 0.5 })]))
            battle.events.push({ type: "status", unit, text: ["éclabousse ", this.dose.potion] })
            for(const target of battle.unitsIn(area)) pour(battle, this.dose, target, this.level)
        })
    }

    public remove(): void {
        this.#observer?.remove()
    }

    /** A barrel holds one potion. */
    public merge(): void {}


    #observer?: Observer
}
