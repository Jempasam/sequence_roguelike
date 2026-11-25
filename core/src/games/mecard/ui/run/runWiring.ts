import type { SoundPlayer } from "../../../../engine/audio"
import type { Seatable } from "../../sync/run/Seats"
import type { Run } from "../../sim/run/Run"

import type { Forwarded } from "../forward/Forwarded"
import { RunSoundLink } from "../sound/RunSoundLink"
import { ALL_RUN_LOCKS, NO_RUN_LOCKS } from "./RunScreen"
import type { RunLocks, RunScreen } from "./RunScreen"

/** What may be done with units to play: planning them, then saying so. Everything else stays locked. */
export function locksForUnits(units: readonly string[]): RunLocks {
    if(units.length === 0) return ALL_RUN_LOCKS
    const isLocked = (unit: { readonly name: string }): boolean => !units.includes(unit.name)
    return { ...ALL_RUN_LOCKS, battle: { isLocked, round: "ready" } }
}

/** What the owner of a run may do: all but the units others play, the round waiting for them. */
export function locksForOwner(isGuests: (unit: Seatable) => boolean): RunLocks {
    return { ...NO_RUN_LOCKS, battle: { isLocked: isGuests, round: "gather" } }
}

/**
 * Make what is heard of the runs a screen shows: the sounds of each, whichever it shows in turn. Done by
 * whoever shows a run, the player or the one who only watches. The particles are the screen's own.
 *
 * @returns What stops it.
 */
export function viewRun(
    run: Run, screen: RunScreen, sounds: SoundPlayer|null, forwarded: Forwarded,
): { dispose(): void } {
    if(!sounds) return { dispose: () => {} }
    const link = new RunSoundLink(run, sounds, forwarded)
    const stop = screen.follow(link)
    return {
        dispose: () => {
            stop()
            link.dispose()
        },
    }
}

/**
 * Show a run to the one who plays it: what the run does is theirs, but the units that others play, if any.
 *
 * @param isGuests - Which units others play, none when the player plays all of them.
 */
export function controlRun(
    screen: RunScreen, run: Run, isGuests: ((unit: Seatable) => boolean)|null,
): void {
    if(screen.engine !== run) screen.engine = run
    screen.locks = isGuests ? locksForOwner(isGuests) : NO_RUN_LOCKS
}

/**
 * Show a run told by another, to one who plays only the units it is given: nothing else is theirs, and none
 * given is a spectator, who may do nothing.
 */
export function seatRun(screen: RunScreen, run: Run, units: readonly string[]): void {
    if(screen.engine !== run) screen.engine = run
    screen.locks = locksForUnits(units)
}
