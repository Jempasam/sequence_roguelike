import type { Vector2 } from "../../../base/Vector2"
import type { ActionRun } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"

import { travel } from "./playing"

/** How fast a unit shoved by a card goes, in meters per second. */
export const SHOVE_SPEED = 6

/** What a shove asks. */
export interface Shove {
    readonly battle: Battle

    /** The unit that shoves: the one that takes the blame of the damage. */
    readonly by: Unit

    readonly target: Unit

    readonly direction: Vector2

    /** How far, in meters. */
    readonly distance: number

    /** How many hearts a shove stopped short takes, each of what stopped it: none by default. */
    readonly impact?: number

    /** Is the wall, or a unit, hurt too? A unit is, a wall just counts. By default only what is shoved. */
    readonly hurtsStruck?: boolean

    /** The bodies it goes through, none by default. */
    readonly through?: readonly Unit[]

    /** How fast it goes, in meters per second. */
    readonly speed?: number
}

/**
 * Shove a unit along a direction, whatever its mobility. Stopped before the whole distance, it takes the
 * impact, and so does the unit that stopped it when asked, with no chain reaction.
 *
 * @returns How far it went.
 */
export function* shove(
    { battle, by, target, direction, distance: asked, impact = 0, hurtsStruck = false, through = [], speed = SHOVE_SPEED }: Shove,
): Generator<void, number, void> {
    const incoming = { target, by, direction, distance: asked }
    target.incomingShove.notify(incoming)
    const distance = incoming.distance
    if(distance <= 0) return 0
    const from = target.position
    target.shoving = true
    let gone
    try {
        gone = yield* travel({ battle, unit: target }, direction, distance, speed, true, through)
    } finally {
        target.shoving = false
    }
    if(gone.distance > 0) target.shoved.notify({ unit: target, from, to: target.position })
    if(gone.distance < distance && impact > 0){
        target.hearts.damage(impact, "physical", by)
        if(hurtsStruck && gone.struck) gone.struck.hearts.damage(impact, "physical", by)
    }
    return gone.distance
}

/**
 * Shove a unit at once, in one stride, rather than over the ticks of an action: what an item does at the start
 * of a round. Told as a shove all the same.
 *
 * @returns How far it went.
 */
export function shoveNow(battle: Battle, by: Unit, target: Unit, direction: Vector2, asked: number): number {
    const incoming = { target, by, direction, distance: asked }
    target.incomingShove.notify(incoming)
    if(incoming.distance <= 0) return 0
    const from = target.position
    target.shoving = true
    try {
        const trip = battle.move(target, direction, incoming.distance, true)
        if(trip.distance > 0) target.shoved.notify({ unit: target, from, to: target.position })
        return trip.distance
    } finally {
        target.shoving = false
    }
}

/** Shove several units one after the other, each by its own way. */
export function* shoveAll(shoves: readonly Shove[]): ActionRun {
    for(const one of shoves) yield* shove(one)
}
