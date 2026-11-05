import type { Vector2 } from "../../../base/Vector2"
import { TICKS_PER_SECOND } from "../../../battle/Battle"
import { still } from "../../../battle/effects"
import type { ActionRun, Indicator, UnitContext } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"

/** What an action shows on a tick. */
type Shown = readonly Indicator[]

/** How fast a unit walks, in meters per second. */
export const WALK_SPEED = 4

/** How far short of a length a move may add up and still have gone all of it: sums of strides drift. */
export const TRAVEL_SLACK = 0.001

/** How long a turn takes, in seconds. */
const TURN_TIME = 0.2

/** How long a short effect stays shown, in seconds: a zap, a word. */
export const SHORT_TIME = 0.3

/** How long a word about an action stays, in seconds: blocked, missed, nobody there. */
export const WORD_TIME = 0.35

/** Seconds as ticks of the simulation, at least one. */
export function ticks(seconds: number): number {
    return Math.max(1, Math.round(seconds * TICKS_PER_SECOND))
}

/** Let a number of seconds go by: a pause in an action. */
export function* wait(seconds: number): ActionRun {
    for(let tick = ticks(seconds); tick > 0; tick--) yield
}

/** Show something for a number of seconds while they go by, nothing by default: a pause in an action. */
export function* hold(battle: Battle, seconds: number, shown: readonly Indicator[] = []): ActionRun {
    if(shown.length > 0) battle.post(still(ticks(seconds) / TICKS_PER_SECOND, shown))
    yield* wait(seconds)
}

/**
 * Show something changing over a number of seconds while they go by, tick after tick: a slash sweeping, a
 * shot flying. What each tick shows is computed on that tick, so it follows the unit moving meanwhile.
 *
 * @param at - What it shows once a share of the time went by, from more than 0 to less than 1.
 */
export function* sweep(battle: Battle, seconds: number, at: (share: number) => Shown): ActionRun {
    const count = ticks(seconds)
    for(let tick = 1; tick < count; tick++){
        battle.post(still(1 / TICKS_PER_SECOND, at(tick / count)))
        yield
    }
}

/**
 * Show something thrown flying over a number of seconds, tick after tick, until it lands, its last tick
 * showing it there: a bomb, a potion.
 *
 * @param at - What it shows once a share of the flight went by, from more than 0 to 1.
 */
export function* flight(battle: Battle, seconds: number, at: (share: number) => Shown): ActionRun {
    const count = ticks(seconds)
    for(let tick = 1; tick <= count; tick++){
        battle.post(still(1 / TICKS_PER_SECOND, at(tick / count)))
        yield
    }
}

/**
 * Move a unit along a direction a little at each tick, at a speed, until it has gone the whole distance or
 * something stops it. The strides are told as one move.
 *
 * @param speed - How fast it goes, in meters per second, a walk by default.
 * @param forced - Is it moved by another, whatever its mobility?
 * @returns How far it went, and the unit it ran into, none when none.
 */
export function* travel(
    { battle, unit }: UnitContext, direction: Vector2, distance: number, speed = WALK_SPEED, forced = false,
): Generator<void, Gone, void> {
    const count = ticks(distance / speed)
    const stride = distance / count
    let gone = 0
    battle.startGlide(unit)
    try {
        for(let tick = 0; tick < count && unit.alive; tick++){
            const moved = battle.move(unit, direction, stride, forced)
            gone += moved.distance
            if(moved.distance < stride - TRAVEL_SLACK) return { distance: gone, struck: moved.struck }
            yield
        }
        return { distance: gone, struck: null }
    } finally {
        battle.endGlide()
    }
}

/** How far a move went, and the unit it ran into, none when none. */
export interface Gone {
    readonly distance: number
    readonly struck: Unit|null
}

/** Turn a unit toward a direction over a few ticks, through its right when it faces straight away. */
export function* turn({ battle, unit }: UnitContext, direction: Vector2): ActionRun {
    const from = unit.direction
    const count = ticks(TURN_TIME)
    for(let tick = 1; tick < count; tick++){
        const blend = from.plus(direction.minus(from).times(tick / count))
        // Facing straight away, the blend goes through nothing halfway: the unit turns through its right.
        unit.direction = blend.normalized ?? from.right
        yield
    }
    battle.turn(unit, direction, count / TICKS_PER_SECOND, from)
    yield
}
