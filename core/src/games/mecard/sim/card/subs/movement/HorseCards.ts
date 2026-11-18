import { DISTANCE, FORCE, UNIT } from "../../../base/keywords"
import type { Pose } from "../../../battle/Action"
import { DamageType } from "../../../battle/DamageType"
import type { Battle } from "../../../battle/Battle"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { NOTE_COLOR, PHYSICAL_COLOR } from "../../../battle/previewColors"
import { DODGE } from "../../../status/subs/Dodge"
import { Rarity } from "../../Rarity"

import { ActionCard } from "../ActionCard"
import { ModifierCard } from "../ModifierCard"
import { whileMoving } from "../modifier/Impacts"
import { hold, SHORT_TIME } from "../tools/playing"
import { shove } from "../tools/shoving"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How close to the way of a move an ally, or an enemy, must stand to be brushed by it, in meters. */
const BRUSH_REACH = 0.5

/** How far an enemy brushed is pushed aside, in meters. */
const BRUSH_SHOVE = 1

/** How much the dodge given to an ally brushed is worth. */
const BRUSH_DODGE = 1

/** How far a unit can be pushed aside by a shy away, and how far it goes, in meters. */
const SHY_RANGE = 4 - UNIT_RADIUS
const SHY_SHOVE = 2

/** How far behind the edge of the unit a kick lands, in meters. */
const KICK_REACH = 1 - UNIT_RADIUS

/** How wide a kick is, in meters. */
const KICK_WIDTH = 0.6

/** How many hearts a kick takes, before the strength of the unit. */
const KICK_DAMAGE = 1

/** How far a kicked unit is thrown back, in meters. */
const KICK_SHOVE = 3

export const STRIDE = new ModifierCard("Foulée", [
    "Joue l'action. Les alliés qui croisent ton chemin gagnent ", DODGE.make(BRUSH_DODGE, DODGE), ", les ennemis sont écartés de ",
    BRUSH_SHOVE, " ", DISTANCE, ".",
], Rarity.RARE, action => whileMoving(action, (ctx, move) => {
    const way = move.to.position.minus(move.from.position).normalized
    if(!way) return
    const brushed = ctx.battle.fetch(Areas.line(move.from.position, move.to.position, BRUSH_REACH * 2), ctx.unit)
    for(const other of brushed){
        if(other.team === ctx.unit.team) ctx.battle.applyStatus(other, DODGE, BRUSH_DODGE)
        else shove({ battle: ctx.battle, by: ctx.unit, target: other, direction: way.right, distance: BRUSH_SHOVE })
    }
}))

/** The nearest unit, ally or enemy, within a range of the edge of a unit at a pose. */
function nearestOther(battle: Battle, unit: Unit, pose: Pose): Unit|null {
    let found: Unit|null = null
    for(const other of battle.touchables){
        if(other === unit) continue
        if(unit.hitbox.gap(pose, other.hitbox, other) > SHY_RANGE) continue
        if(!found || other.position.distance(pose.position) < found.position.distance(pose.position)) found = other
    }
    return found
}

export const SHY_AWAY = new ActionCard("Écart", [
    "Pousse de ", SHY_SHOVE, " ", DISTANCE, " sur ta droite l'", UNIT, " la plus proche, alliée ou ennemie, à ", SHY_RANGE, " ",
    DISTANCE, ". Aucun dégât.",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        const target = nearestOther(battle, unit, unit)
        if(!target){
            hold(battle, SHORT_TIME, [Previews.label(unit.position, "personne en vue", NOTE_COLOR)])
            return
        }
        shove({ battle, by: unit, target, direction: unit.direction.right, distance: SHY_SHOVE })
        hold(battle, SHORT_TIME)
    },
    preview: ({ battle, unit, pose }) => {
        const target = nearestOther(battle, unit, pose)
        return Previews.still(pose, Previews.label(target?.position ?? pose.position, target ? "écart" : "personne en vue", NOTE_COLOR))
    },
})

/** The ground a kick covers: a short narrow band behind a unit at a pose, from the edge of its body. */
function kickArea(unit: Unit, pose: Pose) {
    const from = unit.muzzle(pose, pose.direction.opposite)
    return Areas.line(from, from.minus(pose.direction.times(KICK_REACH * unit.stats.meleeRange.value)), KICK_WIDTH)
}

export const KICK = new ActionCard("Ruade", [
    "Frappe l'", UNIT, " juste derrière toi, à ", KICK_REACH, " ", DISTANCE, " : ", KICK_DAMAGE, "+", FORCE, " ",
    DamageType.PHYSICAL, ", et la repousse de ", KICK_SHOVE, " ", DISTANCE, ".",
], Rarity.COMMON, {
    use: function ({ battle, unit }){
        const hit = battle.strike(unit, kickArea(unit, unit), KICK_DAMAGE + unit.stats.strength.value, DamageType.PHYSICAL)
        for(const target of hit) shove({ battle, by: unit, target, direction: unit.direction.opposite, distance: KICK_SHOVE })
        hold(battle, SHORT_TIME)
    },
    preview: ({ unit, pose }) => Previews.still(pose, Previews.polygon(kickArea(unit, pose), PHYSICAL_COLOR)),
})
