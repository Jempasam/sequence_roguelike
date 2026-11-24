import type { Vector2 } from "../../../base/Vector2"
import type { Visual } from "../../../base/Visual"
import { STRIDES_PER_SECOND } from "../../../battle/rules"
import { sampled, still } from "../../../battle/effects"
import type { Action, Pose, UnitContext } from "../../../battle/Action"
import type { Indicator } from "../../../battle/preview/Preview"
import type { Battle } from "../../../battle/Battle"
import { UNIT_HITBOX, UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { SUMMON_PALETTE } from "../../../battle/palettes"
import { NOTE_COLOR } from "../../../battle/previewColors"
import type { Heart } from "../../../heart/Heart"
import { FLEETING } from "../../../status/subs/Fleeting"
import type { Card } from "../../Card"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

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

/** How long a thrown body flies, in seconds. */
const THROW_TIME = 0.25

/** How far ahead a body is set down by default, in meters: at the contact. */
export const SUMMON_AHEAD = 1 - UNIT_RADIUS

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

/** What a body brought in by an invocation is, wherever it stands. */
export interface Summon {
    readonly sprite: Visual
    readonly name: string

    /** The hearts of one body: asked for each body, as hearts are not shared. */
    hearts(): readonly Heart[]

    /** The cards it plays, round after round, none by default. */
    readonly cards?: readonly Card[]

    /** How much bigger than the base its body is, a factor of its radius. 1 by default. */
    readonly size?: number

    /** Where it faces, as its owner by default. */
    readonly direction?: Vector2

    /** Does it wear away, half a heart at the end of each round? No by default. */
    readonly fleeting?: boolean
}

/** What an invocation card does beyond setting its bodies down. */
export interface Summoning {
    /** What each body gets once set down, beyond what {@link Summon} says. */
    readonly equip?: (battle: Battle, body: Unit, owner: Unit) => void

    /** Are the bodies thrown there, flying, rather than set down at once? */
    readonly thrown?: boolean

    /** The size of the bodies, for the room the preview looks for. 1 by default. */
    readonly size?: number
}

/** The spot ahead of the edge of a unit at a pose where an invocation sets its body down. */
export function summonSpot(unit: Unit, pose: Pose, ahead = SUMMON_AHEAD): Vector2 {
    return unit.muzzle(pose).plus(pose.direction.times(ahead))
}

/** How a body brought in shows in a preview, where it would stand. */
export function summonShown(at: Vector2): Indicator {
    return Previews.polygon(Areas.circle(at, UNIT_RADIUS), { ...SUMMON_PALETTE[0], a: 0.45 })
}

/** The spots of some where a body of a size has room: within the arena, off the others. */
export function summonableSpots(battle: Battle, unit: Unit, spots: readonly Vector2[], size = 1): Vector2[] {
    const hitbox = UNIT_HITBOX.scaled(size)
    return spots.filter(spot => battle.arena.inside(spot, UNIT_RADIUS * size) && battle.free(spot, unit, hitbox))
}

/**
 * What an invocation shows in a preview: each spot with room lit, and what the card shows around it, or a word
 * on the first spot when none has room.
 *
 * @param around - What the card shows around a spot with room, nothing by default.
 */
export function summonShows(
    battle: Battle, unit: Unit, spots: readonly Vector2[], size = 1, around: (spot: Vector2) => readonly Indicator[] = () => [],
): Indicator[] {
    const room = summonableSpots(battle, unit, spots, size)
    if(room.length === 0) return [Previews.label(spots[0] ?? unit.position, "pas de place", NOTE_COLOR)]
    return room.flatMap(spot => [summonShown(spot), ...around(spot)])
}

/**
 * Bring bodies in for a unit, one at each spot, none where there is no room (it tells so): a body with no way of
 * its own but its cards, out of the order of play, of the team of its owner.
 *
 * @returns The bodies set down.
 */
export function summonAt(
    battle: Battle, owner: Unit, spots: readonly Vector2[], summon: Summon, equip?: (body: Unit) => void,
): Unit[] {
    const bodies: Unit[] = []
    for(const at of spots){
        const body = battle.place(owner, {
            sprite: summon.sprite, name: summon.name, at, hearts: summon.hearts(),
            ...summon.cards ? { cards: summon.cards } : {},
            ...summon.size === undefined ? {} : { size: summon.size },
            ...summon.direction ? { direction: summon.direction } : {},
        })
        if(!body) continue
        if(summon.fleeting) battle.applyStatus(body, FLEETING, 1)
        equip?.(body)
        bodies.push(body)
    }
    return bodies
}

/**
 * The action of a card that brings bodies in at spots from where its unit would stand: they are thrown there
 * or set down at once, then it waits a moment. Its preview lights the spots with room.
 *
 * @param spots - Where the bodies stand, from where the unit would stand and face.
 * @param summon - What the bodies are, from the unit, asked when they are set down only.
 */
export function summoning(
    spots: (unit: Unit, pose: Pose) => readonly Vector2[], summon: (unit: Unit, battle: Battle) => Summon,
    { equip, thrown = false, size = 1 }: Summoning = {},
): Action {
    return {
        use: function ({ battle, unit }){
            const at = spots(unit, unit).filter(spot => battle.arena.inside(spot, UNIT_RADIUS * size))
            const body = summon(unit, battle)
            if(thrown){
                flight(battle, THROW_TIME, share => {
                    const from = unit.position
                    const flying = at.map(spot => from.plus(spot.minus(from).times(share)))
                    return flying.map(point => Previews.polygon(Areas.circle(point, UNIT_RADIUS / 2), SUMMON_PALETTE[0]))
                })
            }
            summonAt(battle, unit, at, body, placed => equip?.(battle, placed, unit))
            wait(battle, SHORT_TIME)
        },
        preview: ({ battle, unit, pose }) => {
            return Previews.still(pose, ...summonShows(battle, unit, spots(unit, pose), size))
        },
    }
}
