/**
 * @packageDocumentation
 * What a unit plays: a {@link Card} is a typed function from what the card on its right gives to what it
 * gives, a {@link CardType}, and each is of a {@link Rarity}. A {@link CardChain} is the row of cards a unit
 * plays in a round, read from left to right by {@link read} into {@link CardNode} trees, and resolved at
 * the end of the preparation, each {@link Preparation} rewritten into the cards it gives. The cards
 * themselves live in the module `subs`, one file for each card or family of cards, which this module does
 * not know.
 */

export * from "./Card"
export * from "./CardNode"
export * from "./CardType"
export * from "./CardChain"
export * from "./Rarity"
export * from "./Reading"
