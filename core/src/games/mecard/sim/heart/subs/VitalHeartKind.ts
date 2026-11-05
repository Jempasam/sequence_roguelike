import { rgba } from "../../base/Rgba"
import type { HeartLostEvent } from "../../battle/events"
import { HeartRule } from "../HeartRule"

import { AbstractHeartKind } from "./AbstractHeartKind"

/** How many hearts the vital heart of the catalog heals once lost. */
const VITAL_HEAL = 1

/** A heart that heals its unit once lost. */
export class VitalHeartKind extends AbstractHeartKind {


    constructor(
        /** How many hearts it heals once lost. */
        public readonly healed: number,
    ){
        super("vital", `Perdu, il soigne ${healed} cœur.`, rgba(0.45, 1, 0.65))
    }


    public create(): HeartRule { return new VitalHeartRule(this) }
}

/** The rules of the vital hearts: a heart healed, once lost. */
class VitalHeartRule extends HeartRule {


    constructor(
        public override readonly kind: VitalHeartKind,
    ){
        super(kind)
    }


    public override onLost({ battle, unit, heart }: HeartLostEvent): void {
        battle.signals.notifyHeart.notify({ unit, heart })
        unit.hearts.heal(this.kind.healed)
    }
}

export const VITAL_HEART = new VitalHeartKind(VITAL_HEAL)
