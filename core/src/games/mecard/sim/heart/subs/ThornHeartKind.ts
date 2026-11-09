import { rgba } from "../../base/Rgba"
import type { HeartLostEvent } from "../../battle/events"
import { HeartRule } from "../HeartRule"

import { AbstractHeartKind } from "./AbstractHeartKind"
import { RED_HEART } from "./RedHeartKind"
import { DamageType } from "../../battle/DamageType"

/** How many hearts the thorn heart of the catalog costs whoever breaks it. */
const THORN_DAMAGE = 1

/** A heart that wounds whoever breaks it. */
export class ThornHeartKind extends AbstractHeartKind {


    constructor(
        /** How many hearts it costs whoever breaks it. */
        public readonly damage: number,
    ){
        super(
            "épineux",
            ["Perdu avant tout cœur ", RED_HEART, " : qui le brise prend ", damage, " ", DamageType.PHYSICAL, "."],
            rgba(0.45, 0.8, 0.3),
        )
    }


    public create(): HeartRule { return new ThornHeartRule(this) }
}

/** The rules of the thorn hearts: wound whoever broke one, unless it broke itself. */
class ThornHeartRule extends HeartRule {


    constructor(
        public override readonly kind: ThornHeartKind,
    ){
        super(kind)
    }


    public override onLost({ battle, unit, heart, source }: HeartLostEvent): void {
        if(!source || source === unit) return
        battle.signals.notifyHeart.notify({ unit, heart })
        source.hearts.damage(this.kind.damage, DamageType.PHYSICAL, unit)
    }
}

export const THORN_HEART = new ThornHeartKind(THORN_DAMAGE)
