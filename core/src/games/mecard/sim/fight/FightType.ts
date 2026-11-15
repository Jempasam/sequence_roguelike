import type { Place } from "../run/Journey"
import type { PlaceType } from "../run/PlaceType"
import type { Run } from "../run/Run"

import type { Fight } from "./Fight"

/**
 * A sort of fight, one value for each: what the map tells of it before it is fought, and how a fight of the
 * sort is made.
 *
 * @remarks
 * Its pictures are visuals, keys that nothing here resolves: only an interface loads them, so the simulation
 * runs without any. What a won fight gives is not its own: the halt laid after it on the place says so.
 */
export interface FightType extends PlaceType {
    /**
     * Make a fight of this sort for a run, on a place, the battle of its monsters ready to be fought.
     * Not named `create`, which is how a halt is told from a fight: see {@link isHalt}.
     */
    createFight(run: Run, place: Place): Fight
}
