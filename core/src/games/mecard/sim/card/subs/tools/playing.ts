import type { Vector2 } from "../../../base/Vector2"
import { STRIDES_PER_SECOND } from "../../../battle/rules"
import { sampled, still } from "../../../battle/effects"
import type { UnitContext } from "../../../battle/Action"
import type { Indicator } from "../../../battle/preview/Preview"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"

/** What an action shows at a moment. */
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

/** The strides a move of a length of time is made of, at least one. */
export function strides(seconds: number): number {
    return Math.max(1, Math.round(seconds * STRIDES_PER_SECOND))
}

/** Let a number of seconds go by on the screen, nothing shown: a pause in an action. */
export function wait(battle: Battle, seconds: number): void {
    battle.post(still(seconds, []))
}

/** Show something for a number of seconds, nothing by default: a pause in an action. */
export function hold(battle: Battle, seconds: number, shown: readonly Indicator[] = []): void {
    battle.post(still(seconds, shown))
}

/**
 * Show something changing over a number of seconds: a slash sweeping, a shot flying. What it shows at each
 * moment is computed now, where the battle stands.
 *
 * @param at - What it shows once a share of the time went by, from 0 to 1.
 */
export function sweep(battle: Battle, seconds: number, at: (share: number) => Shown): void {
    battle.post(sampled(seconds, at))
}

/**
 * Show something thrown flying over a number of seconds, until it lands, its last moment showing it there: a
 * bomb, a potion.
 *
 * @param at - What it shows once a share of the flight went by, from 0 to 1.
 */
export function flight(battle: Battle, seconds: number, at: (share: number) => Shown): void {
    battle.post(sampled(seconds, at))
}

/**
 * Move a unit along a direction a little at a time, at a speed, until it has gone the whole distance or
 * something stops it. The strides are told as one move, lasting as long as they take at that speed.
 *
 * @param speed - How fast it goes, in meters per second, a walk by default.
 * @param forced - Is it moved by another, whatever its mobility?
 * @param through - The bodies it goes through, none by default.
 * @returns How far it went, and the unit it ran into, none when none.
 */
export function travel(
    { battle, unit }: UnitContext, direction: Vector2, distance: number, speed = WALK_SPEED, forced = false,
    through: readonly Unit[] = [],
): Gone {
    const count = strides(distance / speed)
    const stride = distance / count
    let gone = 0
    battle.startGlide(unit, speed)
    try {
        for(let done = 0; done < count && unit.alive; done++){
            const moved = battle.move(unit, direction, stride, forced, through)
            gone += moved.distance
            if(moved.distance < stride - TRAVEL_SLACK) return { distance: gone, struck: moved.struck }
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

/** Turn a unit toward a direction, shown over a few moments. */
export function turn({ battle, unit }: UnitContext, direction: Vector2): void {
    battle.turn(unit, direction, TURN_TIME, unit.direction)
}
