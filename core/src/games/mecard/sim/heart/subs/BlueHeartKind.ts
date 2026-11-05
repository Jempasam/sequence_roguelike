import { rgba } from "../../base/Rgba"
import type { UnitContext } from "../../battle/Action"
import { HeartRule } from "../HeartRule"

import { AbstractHeartKind } from "./AbstractHeartKind"

/** Hearts that fade: never healed, the last one lost at the end of each round. */
export class BlueHeartKind extends AbstractHeartKind {


    constructor(){
        super("bleu", "Ne se soigne pas ; le dernier se perd à chaque fin de round.", rgba(0.3, 0.45, 1))
    }


    public create(): HeartRule { return new BlueHeartRule(this) }
}

/** The rules of the blue hearts: lose the last one at the end of each round. */
class BlueHeartRule extends HeartRule {


    public override init(ctx: UnitContext): void {
        this.atRoundEnd(ctx, () => {
            const last = this.lastOf(ctx.unit, heart => !heart.isEmpty)
            if(!last) return
            ctx.battle.signals.notifyHeart.notify({ unit: ctx.unit, heart: last })
            ctx.unit.hearts.remove(this.kind, 1, null)
        })
    }
}

export const BLUE_HEART = new BlueHeartKind()
