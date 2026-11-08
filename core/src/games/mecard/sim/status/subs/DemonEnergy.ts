import { ScalingStatus } from "../ScalingStatus"
import type { StatGain } from "../ScalingStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"

/** A demonic energy: the strength of the unit, for as long as it lasts. */
export const DEMONIC = new StatusType("énergie démoniaque", statusVisual("demonic", 0.85, 0.1, 0.35), "positive", level => new DemonEnergy(level), { description: ["Autant de force que de rounds restants (", STATUS_LEVEL, "), un de moins à chaque round."] })

/** Demonic: as much strength as it has rounds left, so it fades by one each round. Applications add up. */
export class DemonEnergy extends ScalingStatus {


    public readonly type: StatusType = DEMONIC

    protected gains(level: number): readonly StatGain[] {
        return [{ stat: stats => stats.strength, amount: level }]
    }
}
