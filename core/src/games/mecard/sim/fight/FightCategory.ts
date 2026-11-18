import type { PlaceType } from "../run/PlaceType"

/**
 * A sort of fight, one value for each: what the map tells of it before it is fought. The fights themselves
 * are {@link FightType}s, each of a category, and share what the category says.
 *
 * @remarks
 * Its pictures are visuals, keys that nothing here resolves: only an interface loads them, so the simulation
 * runs without any. What a won fight gives is not its own: the halt laid after it on the place says so.
 */
export type FightCategory = PlaceType
