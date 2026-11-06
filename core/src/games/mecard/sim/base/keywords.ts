import { Keyword } from "../../../../semantic"

// The notions the texts of the game name. A sentence writes each as it needs, `COLLAGE.as("collées")`: the
// simulation says what a word means, and nothing of how it is shown or explained.

/** The unit damage and life are counted in, half a heart. */
export const HEART = new Keyword("cœur")

/** Any card made of other cards: a collage, a mélange, or one of two drawn at random. */
export const COMPOSITE = new Keyword("fusion")

/** Cards laid end to end in the room of one, which take its place at the end of the preparation. */
export const FUSION = new Keyword("collage")

/** Two cards of actions played at once. */
export const MERGE = new Keyword("mélange")

/** Two cards of which one is drawn at the end of the preparation. */
export const RANDOM = new Keyword("hasard")

export const CARTE = new Keyword("carte")

export const UNIT = new Keyword("unité")

/** A card taken out of a deck for good. */
export const SUPPRESSION = new Keyword("suppression")

export const DECK = new Keyword("deck")

/** Bringing a unit into the arena, ahead of the one calling it. */
export const INVOCATION = new Keyword("invoquer")

/** A unit made the same as another. */
export const PERFECT_CLONE = new Keyword("clone parfait")
