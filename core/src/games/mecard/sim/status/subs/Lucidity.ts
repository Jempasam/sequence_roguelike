import { CARTE } from "../../base/keywords"
import { ScalingStatus } from "../ScalingStatus"
import type { StatGain } from "../ScalingStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"

/** A lucidity: the chain, the draw and the hand grow with the rounds left. */
export const LUCIDITY = new StatusType("lucidité", statusVisual("lucidity", 0.6, 0.8, 1), "positive", level => new Lucidity(level), {
    description: [
        "Pour chaque round restant (", STATUS_LEVEL, ") : +1 ", CARTE.as("carte"), " dans la chaîne, +1 ",
        CARTE.as("carte"), " piochée et +1 ", CARTE.as("carte"), " dans la main.",
    ],
})

/** Lucid: as many cards more in its chain, its draw and its hand as it has rounds left. */
export class Lucidity extends ScalingStatus {


    public readonly type: StatusType = LUCIDITY

    protected gains(level: number): readonly StatGain[] {
        return [
            { stat: stats => stats.chainSize, amount: level },
            { stat: stats => stats.draw, amount: level },
            { stat: stats => stats.handSize, amount: level },
        ]
    }
}
