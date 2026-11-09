import { rgba } from "../../base/Rgba"
import type { Vector2 } from "../../base/Vector2"
import type { UnitContext } from "../../battle/Action"
import { lineEffect } from "../../battle/effects"
import type { Unit } from "../../battle/Unit"
import { HeartCount } from "../../battle/words"
import { DISTANCE } from "../../base/keywords"
import { Poison, POISONED } from "../../status/subs/Poison"
import { AbstractElement } from "../AbstractElement"
import type { Element } from "../Element"
import { DamageType } from "../../battle/DamageType"

/** How many rounds the plant poisons a unit for. */
const PLANT_POISON = 2

/** How many hearts the plant heals, before the healing of the unit. */
const PLANT_HEAL = 1

/** How far the thorn it calls flies, in meters. */
const THORN_RANGE = 4

/** How many hearts the thorn it calls takes. */
const THORN_DAMAGE = 1

/** How wide the thorn is shown, in meters. */
const THORN_WIDTH = 0.08

/** How long the thorn stays shown, in seconds. */
const THORN_TIME = 0.25

/** Plant: it poisons and heals, and throws a thorn. */
export class Plant extends AbstractElement {


    constructor(){
        super(
            "Plante", rgba(0.4, 0.85, 0.35), "empoisonné",
            new Poison(PLANT_POISON),
            ["soigne ", new HeartCount(PLANT_HEAL), " + soin"],
            ["une épine sur ", THORN_RANGE, " ", DISTANCE, " : ", THORN_DAMAGE, " ", DamageType.PHYSICAL, " au premier corps, et le négatif"],
        )
    }


    public applyNegative({ battle }: UnitContext, target: Unit): void {
        battle.applyStatus(target, POISONED, PLANT_POISON)
    }

    public applyPositive({ unit }: UnitContext, target: Unit): void {
        target.hearts.heal(PLANT_HEAL + unit.stats.heal.value)
    }

    public invoke(ctx: UnitContext, at: Vector2, direction: Vector2, effect: Element): void {
        const { battle, unit } = ctx
        const { end, unit: hit } = battle.ray(unit, THORN_RANGE, { position: at, direction })
        battle.post(lineEffect(at, end, THORN_WIDTH, this.color, THORN_TIME))
        if(!hit) return
        hit.hearts.damage(THORN_DAMAGE, DamageType.PHYSICAL, unit)
        effect.applyNegative(ctx, hit)
    }
}

export const PLANT_ELEMENT = new Plant()
