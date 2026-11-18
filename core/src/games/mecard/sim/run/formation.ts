import { Vector2 } from "../base/Vector2"

// Where the units of a battle stand at its start, and where the hazards of a fight may be laid: the formation of an arena.

/** The size of the arena, in meters. */
export const ARENA_SIZE = 9

/** The size of the square the units stand in at the start, in meters, in the middle of the arena. */
const FORMATION_SIZE = 7

/** How far the square the units start in stands from the walls, in meters. */
const FORMATION_INSET = (ARENA_SIZE - FORMATION_SIZE) / 2

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
 * A spot of the monsters' half of the arena, for a fight that stands its monsters as it wants: the column from the
 * left, 0 to 6, and the row from the top, 0 or 1. A monster of a larger size stands in the top row, with a column of
 * room each side.
 */
export function monsterSpot(column: number, row: number): Vector2 {
    return new Vector2(FORMATION_INSET + 0.5 + column, FORMATION_INSET + 0.5 + row)
}

/**
 * A spot of the middle of the arena, for a fight that lays a hazard there: the column from the left, 0 to 6,
 * and the row from the top, 2 to 4, the rows the monsters stand above and the party below. Between two
 * whole numbers lies the edge of a spot: a wall between two columns is laid at a column and a half.
 */
export function hazardSpot(column: number, row: number): Vector2 {
    return new Vector2(FORMATION_INSET + 0.5 + column, FORMATION_INSET + 0.5 + row)
}
