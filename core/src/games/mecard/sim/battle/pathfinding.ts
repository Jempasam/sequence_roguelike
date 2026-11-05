import { Vector2 } from "../base/Vector2"

import { COLLISION_SLACK } from "./rules"
import type { Battle } from "./Battle"
import type { Unit } from "./Unit"

/** How far apart the points a path goes through stand, in meters. */
const CELL = 0.25

/** How far from a point the first cells of a path may stand, in meters: those around it. */
const START_REACH = CELL * 1.5

/** How far short of a point a straight line may stop and still reach it, in meters. */
const REACHED = 0.01

/** The cells next to a cell, as steps across and down, and how long each step is, in cells. */
const NEIGHBORS: readonly (readonly [number, number, number])[] = [
    [1, 0, 1], [0, 1, 1], [-1, 0, 1], [0, -1, 1],
    [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2], [1, -1, Math.SQRT2],
]

/**
 * The way a unit would walk from a point to a target, around the walls, the pillars and the others: the
 * points it turns at, the first one in a straight line from where it stands, the last one the target. When
 * no way leads there, it goes as near as it can. None when it cannot get any nearer than it stands.
 *
 * @remarks
 * A grid over the arena searched with A*, the bodies staying where they stand: everything is read in a fixed
 * order, with no chance, so a preview and the play both find the same way, on every machine.
 */
export function pathTo(battle: Battle, unit: Unit, from: Vector2, target: Unit): Vector2[] {
    const contact = unit.radius + target.radius + CELL
    if(from.distance(target.position) <= contact) return [target.position]
    const cells = searched(battle, unit, from, target, contact)
    if(cells.length === 0) return []
    const reachesTarget = cells[cells.length - 1].distance(target.position) <= contact
    return straightened(battle, unit, from, reachesTarget ? [...cells, target.position] : cells, target)
}

/** The cells of the way found, in order: to the target, or to the cell nearest to it. */
function searched(battle: Battle, unit: Unit, from: Vector2, target: Unit, contact: number): Vector2[] {
    const { width, height } = battle.arena
    const columns = Math.floor(width / CELL) + 1
    const rows = Math.floor(height / CELL) + 1
    const others = battle.bodies.filter(other => other !== unit && other !== target)
    const pointOf = (cell: number): Vector2 => {
        return new Vector2(cell % columns * CELL, Math.floor(cell / columns) * CELL)
    }
    const standing = new Map<number, boolean>()
    const canStand = (cell: number): boolean => {
        const known = standing.get(cell)
        if(known !== undefined) return known
        const point = pointOf(cell)
        const clearOfOthers = !unit.tangible || others.every(other => {
            return other.position.distance(point) >= unit.radius + other.radius - COLLISION_SLACK
        })
        const can = clearOfOthers && !battle.arena.solid(point, unit.radius, COLLISION_SLACK)
        standing.set(cell, can)
        return can
    }
    const left = (cell: number): number => Math.max(0, pointOf(cell).distance(target.position) - contact)
    const costs = new Map<number, number>()
    const cameFrom = new Map<number, number>()
    const open = new Set<number>()
    const startColumn = Math.round(from.x / CELL)
    const startRow = Math.round(from.y / CELL)
    const span = Math.ceil(START_REACH / CELL)
    for(let row = startRow - span; row <= startRow + span; row++){
        for(let column = startColumn - span; column <= startColumn + span; column++){
            if(column < 0 || row < 0 || column >= columns || row >= rows) continue
            const cell = row * columns + column
            const cost = pointOf(cell).distance(from)
            if(cost > START_REACH || !canStand(cell)) continue
            costs.set(cell, cost)
            open.add(cell)
        }
    }
    let best: number|null = null
    while(open.size > 0){
        const cell = cheapest(open, each => (costs.get(each) ?? Infinity) + left(each))
        open.delete(cell)
        if(best === null || left(cell) < left(best)) best = cell
        if(left(cell) === 0) break
        const column = cell % columns
        const row = Math.floor(cell / columns)
        for(const [across, down, length] of NEIGHBORS){
            const x = column + across
            const y = row + down
            if(x < 0 || y < 0 || x >= columns || y >= rows) continue
            const next = y * columns + x
            const cost = (costs.get(cell) ?? Infinity) + length * CELL
            if(cost >= (costs.get(next) ?? Infinity) || !canStand(next)) continue
            costs.set(next, cost)
            cameFrom.set(next, cell)
            open.add(next)
        }
    }
    if(best === null || pointOf(best).distance(target.position) >= from.distance(target.position)) return []
    const way = [best]
    for(let cell = cameFrom.get(best); cell !== undefined; cell = cameFrom.get(cell)) way.unshift(cell)
    return way.map(pointOf)
}

/** The cell that costs the least, the first of the ties by its place in the grid. */
function cheapest(cells: ReadonlySet<number>, cost: (cell: number) => number): number {
    let found = -1
    let lowest = Infinity
    for(const cell of cells){
        const value = cost(cell)
        if(value < lowest || (value === lowest && cell < found)){
            found = cell
            lowest = value
        }
    }
    return found
}

/** A way with only the points it turns at: from each, the farthest one it walks to in a straight line. */
function straightened(
    battle: Battle, unit: Unit, from: Vector2, way: readonly Vector2[], target: Unit,
): Vector2[] {
    const turns: Vector2[] = []
    let at = from
    let index = 0
    while(index < way.length){
        let next = way.length - 1
        while(next > index && !walks(battle, unit, at, way[next], target)) next--
        turns.push(way[next])
        at = way[next]
        index = next + 1
    }
    return turns
}

/** Does a unit walk straight from a point to another, or into its target on the way? */
function walks(battle: Battle, unit: Unit, from: Vector2, to: Vector2, target: Unit): boolean {
    const direction = to.minus(from).normalized
    if(!direction) return true
    const length = from.distance(to)
    const gone = battle.travel(unit, from, direction, length)
    return gone.struck === target || gone.distance >= length - REACHED
}
