import { SKIP_TURN } from "../../battle/mecanic/step/keyword"
import type { IncomingStep } from "../../battle/mecanic/step/signals"
import * as Steps from "../../battle/mecanic/step"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { TurnStatus } from "../TurnStatus"

/** A stun: the unit lets its next steps go by, which it plays later. */
export const STUNNED = new StatusType(
    "étourdi", statusVisual("stunned", 1, 0.9, 0.45), "negative", level => new Stunned(level),
    {
        description: [
            "Les ", STATUS_LEVEL, " prochaines fois qu'elle doit jouer, elle ", SKIP_TURN.as("passe son tour"),
            " : rien n'est perdu.",
        ],
    },
)

/** Stunned: each step about to start goes by, nothing of it read. Its level: the steps it lets go by. */
export class Stunned extends TurnStatus {


    public readonly type: StatusType = STUNNED

    protected act(incoming: IncomingStep): void {
        Steps.skip(incoming, STUNNED.name)
    }
}
