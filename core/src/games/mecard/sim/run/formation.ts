import type { Rng } from "../base/Rng"
import { Vector2 } from "../base/Vector2"
import type { Pillar } from "../battle/Arena"
import { UNIT_RADIUS } from "../battle/Unit"

// Where the units and the pillars of a battle stand at its start: the formation of an arena.

/** The size of the arena, in meters. */
export const ARENA_SIZE = 9

/** The size of the square the units and the pillars start in, in meters, in the middle of the arena. */
const FORMATION_SIZE = 7

/** How far the square the units start in stands from the walls, in meters. */
const FORMATION_INSET = (ARENA_SIZE - FORMATION_SIZE) / 2

/** How many pillars each arena holds. */
const PILLARS = 3

/** The radius of a pillar, in meters. */
const PILLAR_RADIUS = 0.45

/** How far apart two pillars stand at least, center to center, in meters: room to walk between. */
const PILLAR_SPACING = 2

/** How far a pillar stands at least from where a unit starts, beyond touching it, in meters. */
const PILLAR_CLEARANCE = 0.2

/** How many characters of the party stand in a row at the start of a battle, and how far apart, in meters. */
const PARTY_ROW = 3
const PARTY_SPACING = 2

/**
 * Where each character of a party starts: rows along the bottom of the formation, from the first, the
 * characters of a row centered across it.
 *
 * @param count - How many characters the party holds.
 */
export function partyStarts(count: number): Vector2[] {
    return Array.from({ length: count }, (_, index) => {
        const row = Math.floor(index / PARTY_ROW)
        const inRow = Math.min(PARTY_ROW, count - row * PARTY_ROW)
        const rank = index % PARTY_ROW
        const x = ARENA_SIZE / 2 + (rank - (inRow - 1) / 2) * PARTY_SPACING
        return new Vector2(x, FORMATION_INSET + FORMATION_SIZE - 0.5 - row)
    })
}

/** Where a monster starts: every other meter along the top rows, from the second, in the middle of each. */
export function monsterStart(index: number): Vector2 {
    const spot = 1 + index * 2
    const x = spot % FORMATION_SIZE + 0.5
    const y = Math.floor(spot / FORMATION_SIZE) + 0.5
    return new Vector2(FORMATION_INSET + x, FORMATION_INSET + y)
}

/**
 * How many spots are drawn for a pillar before the pillars laid out so far are given up. Pillars drawn one
 * after the other may leave no room for the last one (two of them two meters apart in the middle), about one
 * layout in 250, and drawing on would never end.
 */
const PILLAR_DRAWS = 500

/**
 * The pillars of an arena, in the middle rows, away from where the units start: the top rows of the
 * monsters, and where the party stands.
 *
 * @param starts - Where the units of the party start.
 * @param rng - What draws where the pillars stand.
 */
export function pillarsFor(starts: readonly Vector2[], rng: Rng): Pillar[] {
    let pillars = laidOut(starts, rng)
    while(pillars === null) pillars = laidOut(starts, rng)
    return pillars
}

/** One try at the pillars of an arena, none when the last pillar found no room. */
function laidOut(starts: readonly Vector2[], rng: Rng): Pillar[]|null {
    const pillars: Pillar[] = []
    const clear = PILLAR_RADIUS + UNIT_RADIUS + PILLAR_CLEARANCE
    while(pillars.length < PILLARS){
        let placed = false
        for(let draw = 0; draw < PILLAR_DRAWS && !placed; draw++){
            const x = FORMATION_INSET + 0.5 + rng.next() * (FORMATION_SIZE - 1)
            const y = FORMATION_INSET + 2.5 + rng.next() * (FORMATION_SIZE - 5)
            const center = new Vector2(x, y)
            const crowded = pillars.some(pillar => pillar.center.distance(center) < PILLAR_SPACING)
            const onStart = starts.some(start => start.distance(center) < clear)
            placed = !crowded && !onStart
            if(placed) pillars.push({ center, radius: PILLAR_RADIUS })
        }
        if(!placed) return null
    }
    return pillars
}
