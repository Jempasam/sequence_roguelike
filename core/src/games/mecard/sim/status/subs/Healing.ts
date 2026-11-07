import type { Text } from "../../../../../semantic"
import { rgba } from "../../base/Rgba"
import type { Observer } from "../../base/Observable"
import { HeartCount } from "../../battle/words"
import type { UnitContext } from "../../battle/Action"
import { BaseStatus } from "../BaseStatus"
import { StatusType } from "../Status"

/** How far a totem heals, in meters. */
export const TOTEM_RADIUS = 1.5

/** A healing totem. */
export const HEALING = new StatusType("soins", rgba(0.5, 1, 0.5), "positive", level => new Healing(level))

/**
 * Healing: at the end of each round, it heals the units of its team around it, by as many halves of hearts as
 * its level. A totem holds it.
 */
export class Healing extends BaseStatus {


    public readonly type: StatusType = HEALING

    public override toString(): string { return `${HEALING} ${new HeartCount(this.level)}` }

    public override toSemString(): Text { return [HEALING, " ", new HeartCount(this.level)] }

    public init({ battle, unit }: UnitContext): void {
        this.#observer = battle.roundEnded.add(() => {
            const area = { kind: "circle", center: unit.position, radius: TOTEM_RADIUS } as const
            const allies = battle.unitsIn(area, unit).filter(ally => ally.team === unit.team)
            if(allies.length > 0) battle.signals.notifyStatus.notify({ unit, status: this })
            for(const ally of allies) ally.hearts.heal(this.level)
        })
    }

    public remove(): void {
        this.#observer?.remove()
    }


    #observer?: Observer
}
