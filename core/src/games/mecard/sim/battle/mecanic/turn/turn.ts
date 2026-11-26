import { Vector2 } from "../../../base/Vector2"
import type { Pose, UnitContext } from "../../Action"
import type { Area } from "../../Area"
import type { Battle } from "../../Battle"
import { COLLISION_SLACK } from "../../rules"
import type { Unit } from "../../Unit"
import { relocate, tell } from "../relocation/relocate"

import { TURNED } from "./signals"

/** How long a turn takes, in seconds. */
const TURN_TIME = 0.2

/** How many times a turn that brings a body into others moves it out of them before it gives up. */
const TURN_PUSHES = 4

/** A unit and the direction a turn gives it. */
export interface Turning {
    readonly unit: Unit
    readonly direction: Vector2
}

/**
 * Turn a unit to face a direction, a meter long.
 *
 * @param duration - How long it took to turn, in seconds: at once by default.
 * @param from - Where it faced before, as it does by default: what the turn is told as starting from.
 */
export function turn(
    battle: Battle, unit: Unit, direction: Vector2, duration = 0, from: Vector2 = unit.direction,
): void {
    const turned = spot(battle, unit, direction)
    if(!turned){
        battle.events.push({ type: "blocked", unit })
        return
    }
    unit.direction = direction
    battle.events.push({ type: "turned", unit })
    const position = unit.position
    tell(battle, TURNED, { unit, from: { position, direction: from }, to: { position, direction }, duration })
    if(!turned.position.equals(position)) relocate(battle, unit, turned.position, 0, TURNED)
}

/** Turn the unit that plays toward a direction, shown over a few moments. */
export function turnToward({ battle, unit }: UnitContext, direction: Vector2): void {
    turn(battle, unit, direction, TURN_TIME, unit.direction)
}

/**
 * Where a unit stands once turned to face a direction, none when it cannot turn. A shape that is not round
 * takes other room turned: a turn that brings it into an obstacle, by more than the slack of the smaller
 * obstacles a move is tried with, is refused; one that brings it in by less moves it out of the obstacle,
 * to where the true ones leave it room. Only what the turn itself brings it into counts, so a round body,
 * whose room never changes, always turns. Changes nothing: a turn and its preview both ask it.
 */
export function spot(battle: Battle, unit: Unit, direction: Vector2): Pose|null {
    const { hitbox } = unit
    const obstacles = obstaclesOf(battle, unit)
    const before = { position: unit.position, direction: unit.direction }
    const worsened = (at: Pose, body: Unit): number => {
        const after = hitbox.gap(at, body.hitbox, body)
        return after < hitbox.gap(before, body.hitbox, body) ? after : Infinity
    }
    const wallsWorsened = (at: Pose): boolean => {
        return unit.bounded && hitbox.crossesWalls(at, battle.arena) && !hitbox.crossesWalls(before, battle.arena)
    }
    let at: Pose = { position: unit.position, direction }
    if(obstacles.some(body => worsened(at, body) < -COLLISION_SLACK)) return null
    for(let tries = 0; tries < TURN_PUSHES; tries++){
        const crowding = obstacles.filter(body => worsened(at, body) < 0)
        const shift = crowding.reduce((total, body) => {
            return total.plus(hitbox.separation(at, body.hitbox, body))
        }, Vector2.ZERO)
        const inWall = wallsWorsened(at)
        if(crowding.length === 0 && !inWall) return at
        if(!unit.movable) return null
        const away = inWall ? wallShift(battle, unit, at) : Vector2.ZERO
        at = { position: at.position.plus(shift).plus(away), direction }
    }
    return obstacles.some(body => worsened(at, body) < 0) || wallsWorsened(at) ? null : at
}

/**
 * What turning every unit in an area would do, each toward a direction of its own: none for a unit whose
 * direction is unknown, which stays as it is. The unit that turns them is never one of them.
 */
export function turnsIn(
    battle: Battle, area: Area, by: Unit, directionOf: (unit: Unit) => Vector2|null,
): Turning[] {
    const turnings: Turning[] = []
    for(const unit of battle.fetch(area, by)){
        const direction = directionOf(unit)
        if(direction) turnings.push({ unit, direction })
    }
    return turnings
}

/** Turn every unit in an area toward a direction of its own, the units it turned returned. */
export function turnUnitsIn(
    battle: Battle, area: Area, by: Unit, directionOf: (unit: Unit) => Vector2|null,
): Unit[] {
    const turnings = turnsIn(battle, area, by, directionOf)
    for(const { unit, direction } of turnings) turn(battle, unit, direction)
    return turnings.map(({ unit }) => unit)
}

/** The bodies a unit cannot overlap: all the tangible ones for a tangible unit, else only the scenery. */
function obstaclesOf(battle: Battle, unit: Unit): Unit[] {
    return battle.bodies.filter(body => body !== unit && (unit.tangible || !body.touchable))
}

/** How far a unit crossing a wall must go to lie wholly within the arena, in meters. */
function wallShift(battle: Battle, unit: Unit, at: Pose): Vector2 {
    const outline = unit.hitbox.outline(at)
    const left = Math.min(...outline.map(point => point.x))
    const right = Math.max(...outline.map(point => point.x))
    const top = Math.min(...outline.map(point => point.y))
    const bottom = Math.max(...outline.map(point => point.y))
    const { width, height } = battle.arena
    return new Vector2(Math.max(0, -left) - Math.max(0, right - width), Math.max(0, -top) - Math.max(0, bottom - height))
}
