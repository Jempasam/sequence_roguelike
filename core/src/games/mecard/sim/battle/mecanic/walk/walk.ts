import type { Vector2 } from "../../../base/Vector2"
import type { Pose, UnitContext } from "../../Action"
import type { Battle } from "../../Battle"
import type { SignalKey } from "../../ObserverMap"
import { COLLISION_SLACK, STRIDES_PER_SECOND } from "../../rules"
import type { Unit } from "../../Unit"
import { canMove, relocate } from "../relocation/relocate"
import type { GlideSignal } from "../relocation/signals"

import { BUMPED, COLLIDED, WALKED } from "./signals"

/** How fast a unit walks, in meters per second. */
export const WALK_SPEED = 4

/** How far short of a length a move may add up and still have gone all of it: sums of strides drift. */
export const TRAVEL_SLACK = 0.001

/**
 * How far a moving unit goes between two checks of what is in its way, in meters. Small enough for a body
 * never to pass through another between two checks.
 */
const TRAVEL_STEP = 0.05

/** How finely a body already in contact backs out of it, in meters. */
const BACK_OUT_STEP = 0.01

/** How far beyond the end of a move its way is tried, for a body ending it inside the slack, in meters. */
const LOOK_AHEAD = 1

/** How fast a unit moved in one go is shown going, in meters per second. */
const ONE_STRIDE_SPEED = 9

/** Where a move ended, or would end. */
export interface Trip {
    /** Where the unit stops. */
    readonly to: Vector2

    /** How far the unit went, in meters. */
    readonly distance: number

    /** The unit it ran into, none when none. */
    readonly struck: Unit|null
}

/** How far a move went, and the unit it ran into, none when none. */
export interface Gone {
    readonly distance: number
    readonly struck: Unit|null
}

/** Where a body stopped, and how far from where it left. */
interface StoppedAt {
    readonly to: Vector2
    readonly distance: number
}

/**
 * Move a unit along a direction at once, as far as it goes before something is in the way: a wall, a pillar,
 * another unit. A unit that cannot move on its own, rooted, does not move unless it is forced.
 *
 * @param forced - Is it moved by another, as a push is, whatever its mobility?
 * @param through - The bodies it goes through, none by default.
 * @param told - What the move is told as, a walk by default.
 * @returns How far it went, and the unit it ran into, none when none.
 */
export function move(
    battle: Battle, unit: Unit, direction: Vector2, distance: number, forced = false,
    through: readonly Unit[] = [], told: SignalKey<GlideSignal> = WALKED,
): Trip {
    if(!forced && !canMove(battle, unit)) return { to: unit.position, distance: 0, struck: null }
    // What others move, a push, a wind, leaves the scenery where it stands.
    if(forced && !unit.movable) return { to: unit.position, distance: 0, struck: null }
    const trip = spot(battle, unit, unit.position, direction, distance, through)
    if(trip.distance < distance) battle.events.push({ type: "blocked", unit })
    if(!forced && trip.struck) battle.observers.of(BUMPED).notify({ unit, struck: trip.struck })
    if(trip.struck) battle.observers.of(COLLIDED).notify({ unit, struck: trip.struck })
    const shift = unit.position.distance(trip.to)
    if(shift > 0) relocate(battle, unit, trip.to, shift / ONE_STRIDE_SPEED, told)
    return trip
}

/**
 * Where the body of a unit would stop, going from a point along a direction: before the first wall,
 * pillar or other body in its way, a body taking no room going through the bodies. Changes nothing: a
 * move and its preview both ask it.
 *
 * @remarks
 * What blocks the way is tested with obstacles a little smaller than they are, so a body brushing past
 * one goes on, and a body against one can still leave it. Once blocked, the body is placed with the true
 * obstacles: it stops at their contact, at the last point where it touched nothing. A move ending inside
 * the slack is tried further: it is blocked too when going on would be, so a move made stride by stride
 * never ends one against what stops the next.
 *
 * @param through - The bodies it goes through, none by default: walls and the other bodies still block.
 */
export function spot(
    battle: Battle, unit: Unit, from: Vector2, direction: Vector2, distance: number, through: readonly Unit[] = [],
): Trip {
    // Nothing moves while the way is tried: what blocks it is read once.
    const bodies = battle.bodies
    const scenery = bodies.filter(body => !body.touchable)
    const { hitbox } = unit
    const stands = (point: Vector2): Pose => ({ position: point, direction: unit.direction })
    const overlaps = (body: Unit, point: Vector2, slack: number): boolean => {
        return hitbox.gap(stands(point), body.hitbox, body) < -slack
    }
    const inWall = (point: Vector2): boolean => unit.bounded && hitbox.crossesWalls(stands(point), battle.arena)
    const clear = (point: Vector2, slack: number): boolean => unit.tangible
        ? !inWall(point) && !bodies.some(body => {
            return body !== unit && !through.includes(body) && overlaps(body, point, slack)
        })
        : !inWall(point) && !scenery.some(body => body !== unit && overlaps(body, point, slack))
    const steps = Math.max(1, Math.ceil(distance / TRAVEL_STEP))
    let reached = from
    let travelled = 0
    let contact = clear(from, 0) ? { to: from, distance: 0 } : null
    const blockedAt = (point: Vector2): Trip => {
        const struck = battle.touchables.find(other => {
            return other !== unit && !through.includes(other) && overlaps(other, point, COLLISION_SLACK)
        }) ?? null
        return { ...contact ?? backedOut(from, direction, free => clear(free, 0)), struck }
    }
    for(let i = 1; i <= steps; i++){
        const next = from.plus(direction.times(distance * i / steps))
        if(!clear(next, COLLISION_SLACK)) return blockedAt(next)
        reached = next
        travelled = distance * i / steps
        if(clear(next, 0)) contact = { to: next, distance: travelled }
    }
    // LOOK AHEAD //
    if(distance > 0 && !clear(reached, 0)){
        for(let ahead = TRAVEL_STEP; ahead <= LOOK_AHEAD; ahead += TRAVEL_STEP){
            const next = from.plus(direction.times(distance + ahead))
            if(!clear(next, COLLISION_SLACK)) return blockedAt(next)
            if(clear(next, 0)) break
        }
    }
    return { to: reached, distance: travelled, struck: null }
}

/** The strides a move of a length of time is made of, at least one. */
export function strides(seconds: number): number {
    return Math.max(1, Math.round(seconds * STRIDES_PER_SECOND))
}

/**
 * Move a unit along a direction a little at a time, at a speed, until it has gone the whole distance or
 * something stops it. The strides are told as one move, lasting as long as they take at that speed.
 *
 * @param speed - How fast it goes, in meters per second, a walk by default.
 * @param forced - Is it moved by another, whatever its mobility?
 * @param through - The bodies it goes through, none by default.
 * @param told - What the move is told as, a walk by default.
 * @returns How far it went, and the unit it ran into, none when none.
 */
export function travel(
    { battle, unit }: UnitContext, direction: Vector2, distance: number, speed = WALK_SPEED, forced = false,
    through: readonly Unit[] = [], told: SignalKey<GlideSignal> = WALKED,
): Gone {
    const count = strides(distance / speed)
    const stride = distance / count
    let gone = 0
    battle.glide.start(unit, speed, told)
    try {
        for(let done = 0; done < count && unit.alive; done++){
            const moved = move(battle, unit, direction, stride, forced, through, told)
            gone += moved.distance
            if(moved.distance < stride - TRAVEL_SLACK) return { distance: gone, struck: moved.struck }
        }
        return { distance: gone, struck: null }
    } finally {
        battle.glide.tell()
    }
}

/**
 * Where a body overlapping an obstacle by less than the slack stops, blocked: backed along its way until it
 * touches nothing, or where it stood when it cannot be. Backing is not going: its distance is none.
 */
function backedOut(from: Vector2, direction: Vector2, clear: (point: Vector2) => boolean): StoppedAt {
    for(let back = BACK_OUT_STEP; back <= COLLISION_SLACK; back += BACK_OUT_STEP){
        const to = from.minus(direction.times(back))
        if(clear(to)) return { to, distance: 0 }
    }
    return { to: from, distance: 0 }
}
