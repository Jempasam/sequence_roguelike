import type { DuelFight } from "./DuelRound"
import type { LifeLedger } from "./LifeBook"

/** What a duel costs the players, polymorphic so a mode chooses the rules of its lives. */
export interface DuelOutcome {
    /**
     * Apply what a duel decided.
     *
     * @param winner - The index of the camp that won, none for a draw.
     */
    apply(fight: DuelFight, winner: number|null, lifeBook: LifeLedger): void
}

/** Each player of the camp that lost loses a life, and a draw costs nobody anything. */
export const LOSERS_LOSE_ONE: DuelOutcome = {
    apply: (fight, winner, lifeBook) => {
        if(winner === null) return
        for(const id of fight.sides[1 - winner]) lifeBook.lose(id)
    },
}
