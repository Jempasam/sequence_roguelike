import type { Vector2 } from "../../../base/Vector2"
import type { Visual } from "../../../base/Visual"
import type { Card } from "../../../card/Card"
import { Heart } from "../../../heart/Heart"
import type { HeartKind } from "../../../heart/HeartKind"
import { RED_HEART } from "../../../heart/subs/RedHeartKind"
import { FLEETING } from "../../../status/subs/Fleeting"
import type { Action, Pose } from "../../Action"
import * as Areas from "../../area/Areas"
import type { Battle } from "../../Battle"
import { sampled, still } from "../../effects"
import { SUMMON_PALETTE } from "../../palettes"
import * as Previews from "../../preview/Previews"
import { UNIT_HITBOX, UNIT_RADIUS } from "../../Unit"
import type { Unit } from "../../Unit"

import { summonShows } from "./shown"

/** How long a thrown body flies, in seconds. */
const THROW_TIME = 0.25

/** How long an invocation waits once its bodies are set down, in seconds. */
const SETTLE_TIME = 0.3

/** How far ahead a body is set down by default, in meters: at the contact. */
export const SUMMON_AHEAD = 1 - UNIT_RADIUS

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

/**
 * Summon a body for a unit, of its team, where there is room: a body with no deck, out of the order of
 * play, lasting as long as its hearts, which it loses one by one at the end of each round. Does nothing
 * when the point is taken.
 */
export function summon(
    battle: Battle, owner: Unit, sprite: Visual, name: string, at: Vector2, hearts: readonly Heart[],
    direction: Vector2 = owner.direction,
): Unit|null {
    const body = battle.place(owner, { sprite, name, at, hearts, direction })
    if(body) battle.applyStatus(body, FLEETING, 1)
    return body
}

/** The bodies a unit summoned, the ones that are still in the battle. */
export function summonsOf(battle: Battle, owner: Unit): Unit[] {
    return battle.units.filter(unit => unit.owner === owner)
}

/** The hearts of a body a unit summons, red ones unless a kind is named: its base ones, and the summoning of the unit on top. */
export function summonedHearts(owner: Unit, count: number, kind: HeartKind = RED_HEART): Heart[] {
    return Heart.many(kind, count + owner.stats.summon.value)
}

/** The spot ahead of the edge of a unit at a pose where an invocation sets its body down. */
export function summonSpot(unit: Unit, pose: Pose, ahead = SUMMON_AHEAD): Vector2 {
    return unit.muzzle(pose).plus(pose.direction.times(ahead))
}

/** The spots of some where a body of a size has room: within the arena, off the others. */
export function summonableSpots(battle: Battle, unit: Unit, spots: readonly Vector2[], size = 1): Vector2[] {
    const hitbox = UNIT_HITBOX.scaled(size)
    return spots.filter(spot => battle.arena.inside(spot, UNIT_RADIUS * size) && battle.free(spot, unit, hitbox))
}

/**
 * Bring bodies in for a unit, one at each spot, none where there is no room (it tells so): a body with no way of
 * its own but its cards, out of the order of play, of the team of its owner.
 *
 * @returns The bodies set down.
 */
export function summonAt(
    battle: Battle, owner: Unit, spots: readonly Vector2[], summoned: Summon, equip?: (body: Unit) => void,
): Unit[] {
    const bodies: Unit[] = []
    for(const at of spots){
        const body = battle.place(owner, {
            sprite: summoned.sprite, name: summoned.name, at, hearts: summoned.hearts(),
            ...summoned.cards ? { cards: summoned.cards } : {},
            ...summoned.size === undefined ? {} : { size: summoned.size },
            ...summoned.direction ? { direction: summoned.direction } : {},
        })
        if(!body) continue
        if(summoned.fleeting) battle.applyStatus(body, FLEETING, 1)
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
 * @param summonOf - What the bodies are, from the unit, asked when they are set down only.
 */
export function summoning(
    spots: (unit: Unit, pose: Pose) => readonly Vector2[], summonOf: (unit: Unit, battle: Battle) => Summon,
    { equip, thrown = false, size = 1 }: Summoning = {},
): Action {
    return {
        use: function ({ battle, unit }){
            const at = spots(unit, unit).filter(spot => battle.arena.inside(spot, UNIT_RADIUS * size))
            const summoned = summonOf(unit, battle)
            if(thrown){
                battle.post(sampled(THROW_TIME, share => {
                    const from = unit.position
                    const flying = at.map(spot => from.plus(spot.minus(from).times(share)))
                    return flying.map(point => Previews.polygon(Areas.circle(point, UNIT_RADIUS / 2), SUMMON_PALETTE[0]))
                }))
            }
            summonAt(battle, unit, at, summoned, placed => equip?.(battle, placed, unit))
            battle.post(still(SETTLE_TIME, []))
        },
        preview: ({ battle, unit, pose }) => {
            return Previews.still(pose, ...summonShows(battle, unit, spots(unit, pose), size))
        },
    }
}
