import { DISTANCE, UNIT } from "../../../base/keywords"
import type { Vector2 } from "../../../base/Vector2"
import type { Action, UnitContext } from "../../../battle/Action"
import { DamageType } from "../../../battle/DamageType"
import type { Unit } from "../../../battle/Unit"
import type { MoveSignal } from "../../../battle/signals"
import { Rarity } from "../../Rarity"

import { ModifierCard } from "../ModifierCard"
import { shove } from "../tools/shoving"
import * as Areas from "../../../battle/area/Areas"

/** How far a unit stopped by another pushes it, in meters. */
const COLLISION_SHOVE = 2

/** How many hearts a collision takes from the unit pushed, if it is stopped short. */
const COLLISION_DAMAGE = 1

/** How far from a unit, in meters beyond the two bodies, another still counts as touched by its move. */
const CONTACT_SLACK = 0.15

/** How much a unit must be ahead of a move, from 0 to 1, to count as what stopped it. */
const AHEAD_SHARE = 0.7

/** How far from the way of a move the units are drawn along, in meters. */
const DRAFT_REACH = 1

/** How far the units drawn along are pushed, in meters. */
const DRAFT_SHOVE = 1.5

/** The way of a move: where it went, as a direction, none when it did not go. */
function wayOf(move: MoveSignal): Vector2|null {
    return move.to.position.minus(move.from.position).normalized
}

/**
 * Watch the moves of a unit while an action plays: each move is told to a watcher. What is watched is put back
 * whatever happens, the preview too.
 */
export function whileMoving(action: Action, watch: (ctx: UnitContext, move: MoveSignal) => void): Action {
    const watching = <T>(ctx: UnitContext, play: () => T): T => {
        const watcher = ctx.battle.signals.moved.add(move => {
            if(move.unit === ctx.unit) watch(ctx, move)
        })
        try {
            return play()
        } finally {
            watcher.remove()
        }
    }
    return {
        use: ctx => watching(ctx, () => action.use(ctx)),
        preview: ctx => action.preview(ctx),
    }
}

/** The unit a move ended against, none when it ended in the open: one ahead of it, in touch with it. */
function stoppedBy(unit: Unit, move: MoveSignal, way: Vector2): Unit|null {
    const end = move.to.position
    for(const other of unit.battle.touchables){
        if(other === unit) continue
        const offset = other.position.minus(end)
        const length = offset.length
        if(length > unit.radius + other.radius + CONTACT_SLACK) continue
        if(length > 0 && offset.dot(way) / length < AHEAD_SHARE) continue
        return other
    }
    return null
}

export const COLLISION = new ModifierCard("Collision", [
    "Joue l'action. Un déplacement arrêté contre une ", UNIT, " la repousse de ", COLLISION_SHOVE, " ", DISTANCE,
    " dans son sens : ", COLLISION_DAMAGE, " ", DamageType.PHYSICAL, " de collision si elle est arrêtée à son tour.",
], Rarity.RARE, action => whileMoving(action, (ctx, move) => {
    const way = wayOf(move)
    if(!way) return
    const struck = stoppedBy(ctx.unit, move, way)
    if(!struck) return
    shove({
        battle: ctx.battle, by: ctx.unit, target: struck, direction: way, distance: COLLISION_SHOVE,
        impact: COLLISION_DAMAGE,
    })
}))

export const DRAFT = new ModifierCard("Appel d'air", [
    "Joue l'action. Chaque ", UNIT, " à ", DRAFT_REACH, " ", DISTANCE, " du trajet d'un déplacement est poussée de ",
    DRAFT_SHOVE, " ", DISTANCE, " dans son sens. Aucun dégât.",
], Rarity.RARE, action => whileMoving(action, (ctx, move) => {
    const way = wayOf(move)
    if(!way) return
    const drawn = ctx.battle.fetch(Areas.line(move.from.position, move.to.position, DRAFT_REACH * 2), ctx.unit)
    for(const target of drawn){
        shove({ battle: ctx.battle, by: ctx.unit, target, direction: way, distance: DRAFT_SHOVE })
    }
}))
