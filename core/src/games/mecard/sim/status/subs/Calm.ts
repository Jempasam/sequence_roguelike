import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import { WAIT } from "../../card/subs/movement/Wait"
import { ScalingStatus } from "../ScalingStatus"
import type { StatGain } from "../ScalingStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"

/** How many meters of vision a round of concentration gives, and how many of range per meter of vision. */
export const CONCENTRATION_VISION = 1
export const CONCENTRATION_RANGE = 0.25

/** A concentration: the vision and the range grow with the rounds left. */
export const CONCENTRATED = new StatusType("concentration", statusVisual("concentration", 0.55, 0.85, 1), "positive", level => new Concentration(level), { description: ["Plus de vision et de portée pour chaque round restant (", STATUS_LEVEL, "), et un round de plus à chaque attente."] })

/** Does the step a unit just played wait? */
function waited({ unit }: UnitContext): boolean {
    return unit.stepsPlayed[unit.stepsPlayed.length - 1] === WAIT.action
}

/** The listener of a status gaining a round at each wait of its unit. */
function onWait(ctx: UnitContext, gain: () => void): Observer {
    return ctx.unit.stepEnded.add(() => {
        if(waited(ctx)) gain()
    })
}

/** Concentrated: more vision and range for each round left, and a round more at each wait. */
export class Concentration extends ScalingStatus {


    public readonly type: StatusType = CONCENTRATED

    protected gains(level: number): readonly StatGain[] {
        return [
            { stat: stats => stats.aimRange, amount: CONCENTRATION_VISION * level },
            { stat: stats => stats.throwRange, amount: CONCENTRATION_RANGE * CONCENTRATION_VISION * level },
        ]
    }

    protected override watch(ctx: UnitContext): Observer[] {
        return [onWait(ctx, () => this.setLevel(this.level + 1))]
    }
}

/** A fury held back: the strength grows with the rounds left. */
export const FURIOUS = new StatusType("fureur contenue", statusVisual("furious", 1, 0.5, 0.2), "positive", level => new HeldFury(level), { description: ["Autant de force que de rounds restants (", STATUS_LEVEL, "), et un round de plus à chaque attente."] })

/** Furious: as much strength as rounds left, and a round more at each wait. */
export class HeldFury extends ScalingStatus {


    public readonly type: StatusType = FURIOUS

    protected gains(level: number): readonly StatGain[] {
        return [{ stat: stats => stats.strength, amount: level }]
    }

    protected override watch(ctx: UnitContext): Observer[] {
        return [onWait(ctx, () => this.setLevel(this.level + 1))]
    }
}
