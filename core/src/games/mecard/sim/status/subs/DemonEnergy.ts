import { rgba } from "../../base/Rgba"
import { ScalingStatus } from "../ScalingStatus"
import type { StatGain } from "../ScalingStatus"
import { StatusType } from "../Status"

/** A demonic energy: the strength of the unit, for as long as it lasts. */
export const DEMONIC = new StatusType("énergie démoniaque", rgba(0.85, 0.1, 0.35), "positive")

/** Demonic: as much strength as it has rounds left, so it fades by one each round. Applications add up. */
export class DemonEnergy extends ScalingStatus {


    public readonly type = DEMONIC

    public copy(): DemonEnergy { return new DemonEnergy(this.rounds) }

    protected gains(rounds: number): readonly StatGain[] {
        return [{ stat: stats => stats.strength, amount: rounds }]
    }
}
