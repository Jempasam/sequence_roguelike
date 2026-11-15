import type { Battle } from "../battle/Battle"
import type { Monster } from "../catalog/monsters"

import type { FightType } from "./FightType"

/** How a fight ended for the party. */
export type FightResult = "won"|"lost"

/**
 * A fight of the journey, as a place holds it: its monsters, and the battle they are fought in. A halt that
 * follows a won fight is told of it, to give what the fight gave.
 *
 * @remarks
 * A fight only makes its battle and takes the party back from it: the battle is the engine of the rules, and
 * the {@link Travel} fights it.
 */
export interface Fight {
    /** The sort of fight it is. */
    readonly type: FightType

    /** The monsters it holds, whoever asks: a halt that follows it, a screen. */
    readonly monsters: readonly Monster[]

    /** The battle of the party against the monsters, its first round left for whoever shows it to start. */
    readonly battle: Battle

    /**
     * Take the party back from the battle, once over: their hearts and what they carry, as the battle left
     * them. A character who fell in a won battle stands up again with one heart.
     *
     * @throws {@link Error} When the battle is not over.
     */
    finish(): FightResult
}
