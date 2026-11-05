import { rgba } from "../../base/Rgba"
import type { HeartLostEvent } from "../../battle/events"
import { HeartRule } from "../HeartRule"

import { AbstractHeartKind } from "./AbstractHeartKind"

/** Hearts that break by pairs: a glass heart broken breaks another one with it. */
export class GlassHeartKind extends AbstractHeartKind {


    constructor(){
        super("verre", "Quand un cœur de verre se brise, un autre cœur de verre se brise avec lui.", rgba(0.9, 0.95, 1))
    }


    public create(): HeartRule { return new GlassHeartRule(this) }
}

/** The rules of the glass hearts: one broken breaks another, which breaks no third. */
class GlassHeartRule extends HeartRule {


    public override onLost({ battle, unit, heart, source }: HeartLostEvent): void {
        if(this.#breaking) return
        if(!this.lastOf(unit, each => !each.isEmpty)) return
        battle.signals.notifyHeart.notify({ unit, heart })
        this.#breaking = true
        try {
            unit.hearts.remove(this.kind, 1, source)
        } finally {
            this.#breaking = false
        }
    }


    /** Is one of its hearts breaking another, which then breaks no third? */
    #breaking = false
}

export const GLASS_HEART = new GlassHeartKind()
