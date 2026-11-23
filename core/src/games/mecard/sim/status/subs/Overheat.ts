import { Add, ModifierKey } from "../../base/Attribute"
import type { Attribute } from "../../base/Attribute"
import type { Observer } from "../../base/Observable"
import type { UnitContext } from "../../battle/Action"
import type { UnitStats } from "../../battle/Unit"
import { RoundStatus } from "../RoundStatus"
import { STATUS_LEVEL, StatusType, statusVisual } from "../Status"
import { BATTLE_ROUND } from "../../base/keywords"

/** How much each stat of a unit overheated gains. */
export const OVERHEAT_BONUS = 1

/** How many rounds a unit overheated gets back for each unit it kills. */
export const OVERHEAT_KILL_ROUNDS = 1

/** The stats an overheat raises: the strength, the precision, the move, the chain, the draw. */
const RAISED: readonly ((stats: UnitStats) => Attribute<number>)[] = [
    stats => stats.strength, stats => stats.precision, stats => stats.move, stats => stats.chainSize, stats => stats.draw,
]

/** An overheat: everything is raised, and each kill buys a round back, but the unit dies when the last round ends. */
export const OVERHEATED = new StatusType("surchauffe", statusVisual("overheat", 1, 0.45, 0.1), "positive", level => new Overheat(level), {
    description: [
        "+", OVERHEAT_BONUS, " force, précision, mouvement, chaîne max et pioche pendant ", STATUS_LEVEL, " ", BATTLE_ROUND.as("rounds"), ". ",
        "Chaque unité tuée donne ", OVERHEAT_KILL_ROUNDS, " ", BATTLE_ROUND, " de plus. À la fin, l'unité meurt.",
    ],
})

/**
 * Overheated: its stats raised, its level the rounds it has left, one more for each kill. When the count down
 * reaches its last round and the round ends, the unit dies.
 */
export class Overheat extends RoundStatus {


    public readonly type: StatusType = OVERHEATED

    protected plug({ battle, unit }: UnitContext): Observer[] {
        const keys = RAISED.map(() => new ModifierKey("surchauffe"))
        RAISED.forEach((stat, index) => stat(unit.stats).add(keys[index], new Add(OVERHEAT_BONUS)))
        return [
            { remove: () => RAISED.forEach((stat, index) => stat(unit.stats).remove(keys[index])) },
            unit.killed.add(() => this.setLevel(this.level + OVERHEAT_KILL_ROUNDS)),
            // Told before the count down of the round: on its last round, the end of it kills.
            battle.roundEnded.add(() => {
                if(this.level <= 1 && unit.alive) unit.hearts.slay(null)
            }),
        ]
    }
}
