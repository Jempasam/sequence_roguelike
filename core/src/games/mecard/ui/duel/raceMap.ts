import type { Progress } from "../../sync/progress/ProgressMessage"

/** How many floors the frieze shows at once when the map has no end. */
export const WINDOW_FLOORS = 3

/** The part of the map a frieze shows, in floors: from where it starts, and how long it is. */
export interface MapScale {
    readonly start: number
    readonly span: number

    /** Is it the whole map, whose end is known? Otherwise it is a window that slides. */
    readonly whole: boolean
}

/**
 * Where a player stands on the map, in floors: the floors it left behind, and how far it went on the floor it is
 * on, from the row it stands on over the rows of the floor. 0 at the start of the first floor.
 */
export function mapPosition(progress: Progress): number {
    const share = progress.rows > 0 ? Math.min(1, Math.max(0, (progress.layer + 1) / progress.rows)) : 0
    return Math.max(0, progress.floor - 1) + share
}

/**
 * The part of the map to show for the positions of the players.
 *
 * @param positions - Where the players stand, in floors, those still in the race.
 * @param total - How many floors the map has in all, none when it goes on without end: then the window starts
 *   at the floor of the player furthest behind, and slides when it leaves that floor.
 */
export function mapScale(positions: readonly number[], total: number|null): MapScale {
    if(total !== null && total > 0) return { start: 0, span: total, whole: true }
    const behind = positions.length > 0 ? Math.min(...positions) : 0
    return { start: Math.floor(behind), span: WINDOW_FLOORS, whole: false }
}

/** How far a position is along a scale, from 0 to 1: a position outside it stays at the nearest end. */
export function scaleRatio(position: number, scale: MapScale): number {
    return Math.min(1, Math.max(0, (position - scale.start) / scale.span))
}

/** Where the limits between floors lie along a scale, as shares of it from 0 to 1, its ends left out. */
export function floorTicks(scale: MapScale): number[] {
    const ticks: number[] = []
    for(let floor = Math.floor(scale.start) + 1; floor < scale.start + scale.span; floor++){
        if(floor > scale.start) ticks.push((floor - scale.start) / scale.span)
    }
    return ticks
}
