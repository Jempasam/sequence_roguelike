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

/** The meters a length in the arena is counted in, written after its number: `2 m`. */
export const DISTANCE = new Keyword("m")

// The stats of a unit, as a text names them.

/** What comes on top of the damage of the blows. */
export const FORCE = new Keyword("force")

/** What comes on top of the damage of the shots. */
export const PRECISION = new Keyword("précision")

/** What the length of the moves of a unit is multiplied by. */
export const AGILITE = new Keyword("agilité")

/** What the length of the throws and the shoves of a unit is multiplied by. */
export const PORTEE = new Keyword("portée")

/** What the length of the blows at hand of a unit is multiplied by. */
export const ALLONGE = new Keyword("allonge")

/** A unit with more of its hearts empty than full. */
export const FEBRILE = new Keyword("fébrile")
