import type { Vector2 } from "../../../base/Vector2"
import type { Battle } from "../../Battle"
import type { SignalKey } from "../../ObserverMap"
import { EIGHT_WAYS } from "../../rules"
import type { Unit } from "../../Unit"

import { RELOCATED } from "./signals"
import type { GlideSignal, JumpSignal } from "./signals"

/** Can a unit move on its own? A rooted one cannot, which is told. */
export function canMove(battle: Battle, unit: Unit): boolean {
    if(unit.stats.mobility.value > 0) return true
    battle.events.push({ type: "skipped", unit, reason: "immobilisé" })
    return false
}

/**
 * Tell a screen that the pose of a unit changed: first as the precise move it is, then as a move of any kind,
 * which a screen falls back on when it shows nothing of the precise one.
 */
export function tell<T extends JumpSignal>(battle: Battle, key: SignalKey<T>, move: T): void {
    battle.observers.of(key).notify(move)
    const { unit, from, to } = move
    const now = { position: unit.position, direction: unit.direction }
    battle.signals.moved.notify({ unit, from, to, now })
}

/**
 * Move a unit to a point, told as a move unless a glide gathers its strides, then tell the listeners.
 *
 * @param duration - How long the move is shown taking, in seconds, when it is told alone.
 * @param told - What the move is told as.
 */
export function relocate(
    battle: Battle, unit: Unit, to: Vector2, duration: number, told: SignalKey<GlideSignal>,
): void {
    battle.glide.keep(unit, told)
    const from = unit.position
    unit.position = to
    if(!battle.glide.gather(from.distance(to))){
        const { direction } = unit
        tell(battle, told, { unit, from: { position: from, direction }, to: { position: to, direction }, duration })
    }
    relocated(battle, unit, from, to)
}

/**
 * Move a unit to a point at once, over whatever lies between, then tell the listeners.
 *
 * @param told - What the jump is told as.
 */
export function jump(battle: Battle, unit: Unit, to: Vector2, told: SignalKey<JumpSignal>): void {
    battle.glide.cut(unit)
    const from = unit.position
    unit.position = to
    const { direction } = unit
    tell(battle, told, { unit, from: { position: from, direction }, to: { position: to, direction } })
    relocated(battle, unit, from, to)
}

/** The free spot nearest to a point among the eight around it at a reach, within the walls, none for none. */
export function nearestFree(battle: Battle, unit: Unit, around: Vector2, reach: number): Vector2|null {
    let nearest: Vector2|null = null
    for(const way of EIGHT_WAYS){
        const spot = battle.arena.clamped(around.plus(way.times(reach)), unit.radius)
        if(!battle.free(spot, unit)) continue
        if(!nearest || spot.distance(around) < nearest.distance(around)) nearest = spot
    }
    return nearest
}

/** Log a move, and tell its listeners. */
function relocated(battle: Battle, unit: Unit, from: Vector2, to: Vector2): void {
    battle.events.push({ type: "moved", unit, from, to })
    unit.observers.of(RELOCATED).notify({ unit, from, to })
    battle.observers.of(RELOCATED).notify({ unit, from, to })
}
