import { rgba } from "../../base/Rgba"
import type { HeartLostEvent } from "../../battle/events"
import { Dodge } from "../../status/subs/Dodge"
import { HeartRule } from "../HeartRule"

import { AbstractHeartKind } from "./AbstractHeartKind"

/** A heart that makes its unit dodge once lost. */
export class QuickHeartKind extends AbstractHeartKind {


    constructor(){
        super("vif", ["Perdu, tu prends ", new Dodge(), " jusqu'à la fin du round."], rgba(0.95, 0.9, 0.35))
    }


    public create(): HeartRule { return new QuickHeartRule(this) }
}

/** The rules of the quick hearts: a dodge, once lost. */
class QuickHeartRule extends HeartRule {


    public override onLost({ battle, unit, heart }: HeartLostEvent): void {
        battle.signals.notifyHeart.notify({ unit, heart })
        battle.applyStatus(unit, new Dodge())
    }
}

export const QUICK_HEART = new QuickHeartKind()
