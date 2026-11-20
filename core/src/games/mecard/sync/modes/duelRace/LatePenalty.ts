import type { LifeBook } from "./LifeBook"

/** What the hub does to a player late to the duels: polymorphic, so a mode chooses its penalty. */
export interface LatePenalty {
    /**
     * Punish a player that is late.
     *
     * @param kick - Tells the player to go to the duels at once.
     */
    penalize(id: string, lifeBook: LifeBook, kick: (id: string) => void): void
}

/** The player loses a life, and is sent to the duels. */
export const KICK_TO_DUEL: LatePenalty = {
    penalize: (id, lifeBook, kick) => {
        lifeBook.lose(id)
        kick(id)
    },
}
