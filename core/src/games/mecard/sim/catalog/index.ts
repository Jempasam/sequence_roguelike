/**
 * @packageDocumentation
 * What a run is made of, beyond the cards, the usables and the items themselves: the monsters and the
 * kits of the heroes. Each is a value, collected here into the pools the loot, the shops and the decks draw
 * from, with the cards of `card/subs`, the usables of `usable/subs` and the items of `item/subs`.
 *
 * @remarks
 * Every catalog Y follows one naming:
 * - `X_Y`, with any X: a part for the systems that concern X (`LEGENDARY_CARDS`, `STARTING_KITS`, `BOSS_MONSTERS`).
 * - `ALL_Y`: all of the catalog, for what writes, reads or lists it (saves, console, library).
 * - `LOOT_Y`: what is found the standard way, for what offers it (loot, shops, halts).
 */

export * from "./cards"
export * from "./items"
export * from "./usables"
export * from "./kits"
export * from "./monsters"
export * from "./pets"
