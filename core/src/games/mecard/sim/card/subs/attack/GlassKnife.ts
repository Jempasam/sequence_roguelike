import { DISTANCE, FORCE, HEART, UNIT } from "../../../base/keywords"
import type { Action, Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import { DamageType } from "../../../battle/DamageType"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { BlowCard } from "./BlowCard"
import { THRUST_RANGE, THRUST_WIDTH } from "./Thrust"
import * as Areas from "../../../battle/area/Areas"

/** How many hearts the glass knife takes, before the strength of the unit: less than a thrust. */
const GLASS_KNIFE_DAMAGE = 1

/**
 * A thin thrust that wounds its holder back: the hearts the enemies lose during it, less the strength of the
 * unit, are lost by the unit too, once it is done.
 */
export class GlassKnifeCard extends BlowCard {


    constructor(){
        super("Couteau de verre", [
            "Frappe devant : ", GLASS_KNIFE_DAMAGE, "+", FORCE, " ", DamageType.PHYSICAL, " à chaque ", UNIT,
            " jusqu'à ", THRUST_RANGE, " ", DISTANCE, ". Contrecoup : tu subis ensuite autant de ", DamageType.PHYSICAL,
            " que de ", HEART.as("cœurs"), " perdus par les ennemis pendant cette action, moins ta ", FORCE, ".",
        ], Rarity.RARE, GLASS_KNIFE_DAMAGE)
    }


    public reach(_battle: Battle, unit: Unit, pose: Pose, progress: number): Area {
        const from = unit.muzzle(pose)
        const to = from.plus(pose.direction.times(THRUST_RANGE * unit.stats.meleeRange.value * progress))
        return Areas.line(from, to, THRUST_WIDTH)
    }

    public override get(): Action {
        const blow = this.action
        return {
            use: ctx => {
                const { battle, unit } = ctx
                let lost = 0
                const watching = battle.signals.damaged.add(({ unit: hurt, amount }) => {
                    if(hurt.team !== unit.team) lost += amount
                })
                try {
                    blow.use(ctx)
                } finally {
                    watching.remove()
                }
                const back = Math.max(0, Math.floor(lost) - unit.stats.strength.value)
                if(back > 0 && unit.alive) unit.hearts.damage(back, DamageType.PHYSICAL, null)
            },
            preview: ctx => blow.preview(ctx),
        }
    }
}

export const GLASS_KNIFE = new GlassKnifeCard()
