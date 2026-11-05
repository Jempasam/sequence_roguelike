import type { Text } from "../../../../../semantic"
import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import { HeartCount } from "../../battle/words"
import type { UnitContext } from "../../battle/Action"
import { StatusType } from "../Status"
import type { Status } from "../Status"

/** How far a totem heals, in meters. */
export const TOTEM_RADIUS = 1.5

/** A healing totem. */
export const HEALING = new StatusType("soins", rgba(0.5, 1, 0.5), "positive")

/** Healing: at the end of each round, it heals the units of its team around it. A totem holds it. */
export class Healing implements Status {


    public readonly type = HEALING

    constructor(
        /** How many hearts it gives each unit around. */
        public readonly halves: number,
    ){}


    public copy(): Healing { return new Healing(this.halves) }

    public toString(): string { return `${HEALING} ${new HeartCount(this.halves)}` }

    public toSemString(): Text { return [HEALING, " ", new HeartCount(this.halves)] }

    public init({ battle, unit }: UnitContext): void {
        this.#observer = battle.roundEnded.add(() => {
            const area = { kind: "circle", center: unit.position, radius: TOTEM_RADIUS } as const
            const allies = battle.unitsIn(area, unit).filter(ally => ally.team === unit.team)
            if(allies.length > 0) battle.signals.notifyStatus.notify({ unit, status: this })
            for(const ally of allies) ally.hearts.heal(this.halves)
        })
    }

    public remove(): void {
        this.#observer?.remove()
    }

    /** A totem heals by one amount. */
    public merge(): void {}


    #observer?: Observer
}
