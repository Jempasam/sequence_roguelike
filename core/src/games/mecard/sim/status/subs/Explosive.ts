import type { Text } from "../../../../../semantic"
import { DISTANCE, UNIT } from "../../base/keywords"
import type { UnitContext } from "../../battle/Action"
import * as Areas from "../../battle/area/Areas"
import { BaseStatus } from "../BaseStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"

/** How far the blast of an explosive reaches whatever its level, in meters. */
export const EXPLOSIVE_BASE = 0.7

/** How much farther the blast of an explosive reaches for each level, in meters. */
export const EXPLOSIVE_PER_LEVEL = 0.25

/** How far the blast of an explosive of a level reaches, in meters. */
export function explosiveRadius(level: number): number {
    return EXPLOSIVE_BASE + level * EXPLOSIVE_PER_LEVEL
}

/** What a body that blows up when it dies holds. */
export const EXPLOSIVE = new StatusType("explosif", statusVisual("explosive", 1, 0.6, 0.15), "neutral", level => new Explosive(level), {
    description: [
        "À sa mort, explose : ", STATUS_LEVEL, " dégâts à chaque ", UNIT, " à ", EXPLOSIVE_BASE, " + ",
        EXPLOSIVE_PER_LEVEL, "×", STATUS_LEVEL, " ", DISTANCE, " autour. Elle est épargnée.",
    ],
})

/**
 * Explosive: once its unit dies, it blows up, as many hearts as its level to every unit around, which the
 * more it holds, the farther it reaches. The unit is spared, being gone.
 */
export class Explosive extends BaseStatus {


    public readonly type: StatusType = EXPLOSIVE

    public override toString(): string { return `${EXPLOSIVE} ${this.level}` }

    public override toSemString(): Text { return [EXPLOSIVE, ` ${this.level}`] }

    public init({ battle, unit }: UnitContext): void {
        this.keep(unit.onDeath.add(() => {
            const area = Areas.circle(unit.position, explosiveRadius(this.level))
            battle.signals.notifyStatus.notify({ unit, target: this })
            battle.explode(area, this.level, unit.owner ?? unit, unit)
        }))
    }

    public remove(): void {
        this.letGo()
    }
}
