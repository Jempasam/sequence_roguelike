import { BATTLE_TURN } from "../../base/keywords"
import type { UnitContext } from "../../battle/Action"
import { DISABLE, SKIP_TURN } from "../../battle/mecanic/step/keyword"
import type { IncomingStep } from "../../battle/mecanic/step/signals"
import * as Steps from "../../battle/mecanic/step"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { TurnStatus } from "../TurnStatus"

/** An electrocution: the unit loses its next steps. */
export const ELECTROCUTED = new StatusType(
    "électrocuté", statusVisual("electrocuted", 0.45, 0.85, 1), "negative", level => new Electrocuted(level),
    {
        description: [
            "Les ", STATUS_LEVEL, " prochaines fois qu'elle doit jouer, l'", BATTLE_TURN.as("étape"), " prévue est ",
            DISABLE.as("grisée"), " et elle ", SKIP_TURN.as("passe son tour"), ".",
        ],
    },
)

/** Electrocuted: each step about to start is disabled, and goes by. Its level: the steps it loses. */
export class Electrocuted extends TurnStatus {


    public readonly type: StatusType = ELECTROCUTED

    protected act(incoming: IncomingStep, { battle, unit }: UnitContext): void {
        Steps.disable(battle, unit)
        Steps.skip(incoming, ELECTROCUTED.name)
    }
}
