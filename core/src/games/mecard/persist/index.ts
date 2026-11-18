/**
 * @packageDocumentation
 * What keeps a run on the storage of the player, by observing it: a {@link RunSaver} keeps the run in
 * progress for the menu to go on with, and a {@link RunHistorian} writes each game that ended in the history.
 */

export * from "./RunHistorian"
export * from "./RunSaver"
