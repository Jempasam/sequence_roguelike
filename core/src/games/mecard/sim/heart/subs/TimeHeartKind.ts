import { rgba } from "../../base/Rgba"
import type { UnitContext } from "../../battle/Action"
import { HeartRule } from "../HeartRule"

import { AbstractHeartKind } from "./AbstractHeartKind"

/** Hearts that count rounds: no wound takes them, and the last one burns out at the end of each round. */
export class TimeHeartKind extends AbstractHeartKind {


    constructor(){
        super(
            "temps", "Ne prend aucun dégât et bloque ceux qui l'atteignent ; le dernier se consume à chaque fin de round.",
            rgba(0.97, 0.97, 0.97),
        )
    }


    public create(): HeartRule { return new TimeHeartRule(this) }
}

/** The rules of the time hearts: refuse every wound, burn the last one out at the end of each round. */
class TimeHeartRule extends HeartRule {


    public override init(ctx: UnitContext): void {
        this.atRoundEnd(ctx, () => ctx.unit.hearts.remove(this.kind, 1, null))
    }

    public override doDamage(): boolean {
        return false
    }
}

export const TIME_HEART = new TimeHeartKind()
