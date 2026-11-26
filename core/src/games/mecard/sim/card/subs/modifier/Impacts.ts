import { DISTANCE, UNIT } from "../../../base/keywords"
import type { Vector2 } from "../../../base/Vector2"
import type { Action, UnitContext } from "../../../battle/Action"
import { DamageType } from "../../../battle/DamageType"
import type { Unit } from "../../../battle/Unit"
import { Rarity } from "../../Rarity"

import { ModifierCard } from "../ModifierCard"
import { VIOLENT_PUSH } from "../../../battle/mecanic/push/keyword"
import { PUSH_DAMAGE } from "../../../battle/mecanic/push/shove"
import { SHOVED } from "../../../battle/mecanic/push/signals"
import type { GlideSignal } from "../../../battle/mecanic/relocation/signals"
import { WALKED } from "../../../battle/mecanic/walk/signals"
import * as Pushing from "../../../battle/mecanic/push"
import * as Walk from "../../../battle/mecanic/walk"
import * as Areas from "../../../battle/area/Areas"

/** How far a unit stopped by another pushes it, in meters. */
const COLLISION_SHOVE = 2

/** How far from a unit, in meters beyond the two bodies, another still counts as touched by its move. */
const CONTACT_SLACK = 0.15

/** How far beyond the end of a move what stopped it is looked for, in meters: enough for a hit off center. */
const LOOK_AHEAD = 1

/** How far from the way of a move the units are drawn along, in meters. */
const DRAFT_REACH = 1

/** How far the units drawn along are pushed, in meters. */
const DRAFT_SHOVE = 1.5

/** The way of a move: where it went, as a direction, none when it did not go. */
function wayOf(move: GlideSignal): Vector2|null {
    return move.to.position.minus(move.from.position).normalized
}

/**
 * Watch the walks and the shoves of a unit while an action plays: each is told to a watcher. What is watched is
 * put back whatever happens, the preview too.
 */
export function whileMoving(action: Action, watch: (ctx: UnitContext, move: GlideSignal) => void): Action {
    const watching = <T>(ctx: UnitContext, play: () => T): T => {
        const watchers = [WALKED, SHOVED].map(key => ctx.battle.observers.of(key).add(move => {
            if(move.unit === ctx.unit) watch(ctx, move)
        }))
        try {
            return play()
        } finally {
            for(const watcher of watchers) watcher.remove()
        }
    }
    return {
        use: ctx => watching(ctx, () => action.use(ctx)),
        preview: ctx => action.preview(ctx),
    }
}

/** The unit a move ended against, and where the unit that moved touches it. */
interface Hit {
    readonly struck: Unit
    readonly contact: Vector2
}

/**
 * What a move ended against, none when it ended in the open: the unit that would stop it going on, in touch
 * with it where it ended.
 */
function stoppedBy(unit: Unit, move: GlideSignal, way: Vector2): Hit|null {
    const { to: contact, struck } = Walk.spot(unit.battle, unit, move.to.position, way, LOOK_AHEAD)
    if(!struck || unit.hitbox.gap(move.to, struck.hitbox, struck) > CONTACT_SLACK) return null
    return { struck, contact }
}

export const COLLISION = new ModifierCard("Collision", [
    "Joue l'action. Un déplacement arrêté contre une ", UNIT, " la ", VIOLENT_PUSH.as("pousse violemment"), " de ",
    COLLISION_SHOVE, " ", DISTANCE, ", dans l'axe du choc. Choc : ", PUSH_DAMAGE, " ", DamageType.PHYSICAL, ".",
], Rarity.RARE, action => whileMoving(action, (ctx, move) => {
    const way = wayOf(move)
    if(!way) return
    const hit = stoppedBy(ctx.unit, move, way)
    if(!hit) return
    const direction = Pushing.knockedWay(hit.struck, hit.contact, way)
    Pushing.shoveViolently({
        battle: ctx.battle, by: ctx.unit, target: hit.struck, direction, distance: COLLISION_SHOVE,
        damage: PUSH_DAMAGE,
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
        Pushing.shove({ battle: ctx.battle, by: ctx.unit, target, direction: way, distance: DRAFT_SHOVE })
    }
}))
