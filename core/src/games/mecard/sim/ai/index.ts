/**
 * @packageDocumentation
 * The bots: {@link DeckAi} plays a bot with its hand read from left to right. A {@link UnitController}
 * decides what a unit does from a view of the battle: {@link DeckAi} and {@link RandomAi} are the basic ones.
 */

export * from "./UnitController"
export * from "./Bot"
export * from "./RandomAi"
export * from "./PredictingController"
export { combine, guessKey, known, lineCloseness, withoutDecks } from "./lookaheadHelpers"
export type { Combination, GuessGroup } from "./lookaheadHelpers"
export * from "./ShuffleAi"
export * from "./LookaheadAi"
export * from "./chains"
export * from "./catalog"
