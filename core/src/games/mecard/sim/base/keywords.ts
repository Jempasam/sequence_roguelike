import { Keyword } from "../../../../semantic"

// The notions the texts of the game name. A sentence writes each as it needs, `COLLAGE.as("collées")`: the
// simulation says what a word means, and nothing of how it is shown or explained.

/** The unit damage and life are counted in, half a heart. */
export const HEART = new Keyword("cœur")

/** What the party spends in the shops and finds on its way. */
export const GOLD = new Keyword("or")

/** A round of a battle: every unit commits its chain, then they all play it. */
export const BATTLE_ROUND = new Keyword("round")

/** One step of the chain of a unit, played in a round. */
export const BATTLE_TURN = new Keyword("tour")

/** A place of the map of a floor: a fight, then a halt, and the places it leads to. */
export const TRAVEL_STEP = new Keyword("étape")

/** A place of the map where the party stops to choose, buy or change something. */
export const HALT = new Keyword("halte")

/** What the party fights: a unit played by the game, with its own deck. */
export const MONSTER = new Keyword("monstre")

/** A monster tamed, which fights beside the party. */
export const PET = new Keyword("familier")

/** A kit of cards, items and usables, that of a hero of the party. */
export const ADVENTURER = new Keyword("aventurier")

/** A chain of cards a card is improved with. */
export const UPGRADE = new Keyword("amélioration")

/** What a hero carries and is helped by all the time. */
export const ITEM = new Keyword("objet")

/** What a hero uses a few times, then it is spent. */
export const USABLE = new Keyword("utilisable")

/** A pack of cards, from which a few are drawn. */
export const BOOSTER = new Keyword("booster")

/** A fight on the map. */
export const FIGHT = new Keyword("combat")

/** What the party chooses after winning a fight. */
export const REWARD = new Keyword("récompense")

/** A level of the dungeon, with its own map. */
export const FLOOR = new Keyword("étage")

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

/** What comes on top of the hearts a heal gives back. */
export const HEAL = new Keyword("soin")

/** What comes on top of the life of the units a unit summons. */
export const SUMMON_STAT = new Keyword("invocation")

/** What comes on top of the level of the potions of a unit. */
export const ALCHEMY = new Keyword("alchimie")

/** A unit with half of its hearts empty, or more. */
export const FEBRILE = new Keyword("fébrile")
