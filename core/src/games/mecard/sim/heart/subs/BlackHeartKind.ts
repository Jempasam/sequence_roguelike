import { colored, rgba } from "../../base/Rgba"
import type { Text } from "../../../../../semantic"
import type { UnitContext } from "../../battle/Action"
import type { HeartRule } from "../HeartRule"

import { AbstractHeartKind } from "./AbstractHeartKind"
import { KeptHeartRule } from "./KeptHeartRule"

/** The color its name is written in: its own would vanish on the dark panels. */
const NAME_COLOR = rgba(0.65, 0.45, 0.75)

/** Hearts that wear out: healed as red ones are, the last full one lost at the end of each round. */
export class BlackHeartKind extends AbstractHeartKind {


    constructor(){
        super("noir", "Se soigne ; le dernier se perd à chaque fin de round.", rgba(0.22, 0.12, 0.25))
    }


    public create(): HeartRule { return new BlackHeartRule(this) }

    public override toSemString(): Text { return colored(NAME_COLOR, this.name) }
}

/** The rules of the black hearts: kept empty and healed, the last full one lost at the end of each round. */
class BlackHeartRule extends KeptHeartRule {


    public override init(ctx: UnitContext): void {
        this.atRoundEnd(ctx, () => {
            const last = this.lastOf(ctx.unit, heart => !heart.isEmpty)
            if(!last) return
            ctx.battle.signals.notifyHeart.notify({ unit: ctx.unit, heart: last })
            ctx.unit.hearts.remove(this.kind, 1, null)
        })
    }
}

export const BLACK_HEART = new BlackHeartKind()
