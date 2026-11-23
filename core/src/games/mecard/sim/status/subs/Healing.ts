import type { Text } from "../../../../../semantic"
import { BATTLE_ROUND, HEART, UNIT } from "../../base/keywords"
import { HeartCount } from "../../battle/words"
import type { UnitContext } from "../../battle/Action"
import { BaseStatus } from "../BaseStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import * as Areas from "../../battle/area/Areas"

/** How far a totem heals, in meters. */
export const TOTEM_RADIUS = 1.5

/** A healing totem. */
export const HEALING = new StatusType("soins", statusVisual("healing", 0.5, 1, 0.5), "positive", level => new Healing(level), {
    description: [
        "À la fin de chaque ", BATTLE_ROUND, ", soigne les ", UNIT.as("unités"), " de son équipe autour de lui de ",
        STATUS_LEVEL, " demi-", HEART.as("cœurs"), ".",
    ],
})

/**
 * Healing: at the end of each round, it heals the units of its team around it, by as many halves of hearts as
 * its level. A totem holds it.
 */
export class Healing extends BaseStatus {


    public readonly type: StatusType = HEALING

    public override toString(): string { return `${HEALING} ${new HeartCount(this.level)}` }

    public override toSemString(): Text { return [HEALING, " ", new HeartCount(this.level)] }

    public init({ battle, unit }: UnitContext): void {
        this.keep(battle.roundEnded.add(() => {
            const area = Areas.circle(unit.position, TOTEM_RADIUS)
            const allies = battle.fetch(area, unit).filter(ally => ally.team === unit.team)
            if(allies.length > 0) battle.signals.notifyStatus.notify({ unit, target: this })
            for(const ally of allies) ally.hearts.heal(this.level)
        }))
    }

    public remove(): void {
        this.letGo()
    }
}
