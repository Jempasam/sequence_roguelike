import { Vector2 } from "../base/Vector2"

import { COLLISION_SLACK } from "./rules"
import { spot } from "./mecanic/walk/walk"
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
        const at = { position: point, direction: unit.direction }
        const clearOfOthers = !unit.tangible || others.every(other => {
            return unit.hitbox.gap(at, other.hitbox, other) >= -COLLISION_SLACK
        })
        const can = clearOfOthers && !(unit.bounded && unit.hitbox.crossesWalls(at, battle.arena))
        standing.set(cell, can)
        return can
    }
    const lefts = new Map<number, number>()
    const left = (cell: number): number => {
        const known = lefts.get(cell)
        if(known !== undefined) return known
        const value = Math.max(0, pointOf(cell).distance(target.position) - contact)
        lefts.set(cell, value)
        return value
    }
    const costs = new Map<number, number>()
    const cameFrom = new Map<number, number>()
    const open = new OpenCells()
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
            open.add(cell, cost + left(cell))
        }
    }
    let best: number|null = null
    for(let cell = open.pop(); cell !== null; cell = open.pop()){
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
            open.add(next, cost + left(next))
        }
    }
    if(best === null || pointOf(best).distance(target.position) >= from.distance(target.position)) return []
    const way = [best]
    for(let cell = cameFrom.get(best); cell !== undefined; cell = cameFrom.get(cell)) way.unshift(cell)
    return way.map(pointOf)
}

/**
 * The cells left to search, each with what it is thought to cost: taken out the cheapest first, the first of
 * the ties by its place in the grid.
 *
 * @remarks
 * A binary heap. A cell given a lower cost is put in again, and what it held before is skipped when it comes
 * out: only the entry with its last cost stands for it.
 */
class OpenCells {

    readonly #costs = new Map<number, number>()
    readonly #heap: number[] = []
    readonly #heapCosts: number[] = []

    /** Put a cell in, or give it another cost. */
    public add(cell: number, cost: number): void {
        this.#costs.set(cell, cost)
        this.#heap.push(cell)
        this.#heapCosts.push(cost)
        this.#up(this.#heap.length - 1)
    }

    /** Take out the cheapest cell, none when there is none left. */
    public pop(): number|null {
        while(this.#heap.length > 0){
            const cell = this.#heap[0]
            const cost = this.#heapCosts[0]
            const lastCell = this.#heap.pop()!
            const lastCost = this.#heapCosts.pop()!
            if(this.#heap.length > 0){
                this.#heap[0] = lastCell
                this.#heapCosts[0] = lastCost
                this.#down(0)
            }
            if(this.#costs.get(cell) !== cost) continue
            this.#costs.delete(cell)
            return cell
        }
        return null
    }

    #before(first: number, second: number): boolean {
        const a = this.#heapCosts[first]
        const b = this.#heapCosts[second]
        return a < b || (a === b && this.#heap[first] < this.#heap[second])
    }

    #swap(first: number, second: number): void {
        const heap = this.#heap
        const costs = this.#heapCosts;
        [heap[first], heap[second]] = [heap[second], heap[first]];
        [costs[first], costs[second]] = [costs[second], costs[first]]
    }

    #up(index: number): void {
        while(index > 0){
            const parent = (index - 1) >> 1
            if(!this.#before(index, parent)) return
            this.#swap(index, parent)
            index = parent
        }
    }

    #down(index: number): void {
        const size = this.#heap.length
        for(;;){
            const left = index * 2 + 1
            const right = left + 1
            let first = index
            if(left < size && this.#before(left, first)) first = left
            if(right < size && this.#before(right, first)) first = right
            if(first === index) return
            this.#swap(index, first)
            index = first
        }
    }
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
    const gone = spot(battle, unit, from, direction, length)
    return gone.struck === target || gone.distance >= length - REACHED
}
