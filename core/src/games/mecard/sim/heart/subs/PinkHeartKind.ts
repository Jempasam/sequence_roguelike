import { rgba } from "../../base/Rgba"
import type { UnitContext } from "../../battle/Action"
import { HeartRule } from "../HeartRule"
import { Heart } from "../Heart"

import { AbstractHeartKind } from "./AbstractHeartKind"

/** Hearts that come back: lost, each leaves an empty place, the last of which fills at each end of round. */
export class PinkHeartKind extends AbstractHeartKind {


    constructor(){
        super("rose", "Perdu, il laisse une place vide ; à chaque fin de round, le dernier rose perdu revient.", rgba(1, 0.55, 0.75))
    }


    public create(): HeartRule { return new PinkHeartRule(this) }
}

/** The rules of the pink hearts: kept empty once lost, the last empty one filled at the end of each round. */
class PinkHeartRule extends HeartRule {


    public override init(ctx: UnitContext): void {
        this.atRoundEnd(ctx, () => {
            const last = this.lastOf(ctx.unit, heart => heart.isEmpty)
            if(!last) return
            ctx.battle.signals.notifyHeart.notify({ unit: ctx.unit, heart: last })
            ctx.unit.hearts.restore(last)
        })
    }

    public override onReplacement(heart: Heart): Heart {
        return new Heart(heart.kind, true)
    }
}

export const PINK_HEART = new PinkHeartKind()
