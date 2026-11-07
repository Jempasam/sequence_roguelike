/**
 * @packageDocumentation
 * What a run is made of, written down as JSON and read back, to send it or keep it: {@link saveBattle} and
 * {@link loadBattle} for a battle, {@link saveTravel} and {@link loadTravel} for a journey, and
 * {@link saveRun} and {@link loadRun} for a run between its fights, its journey with it. They name every
 * card, item, heart, status, monster and floor by its name in the catalog. Each is written down at a rest
 * only: a battle during a preparation or once over, a journey on its map.
 */

export * from "./battleSave"
export * from "./catalogNames"
export * from "./runSave"
export * from "./statusCodecs"
export * from "./travelSave"
