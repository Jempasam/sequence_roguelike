import { AGILITE, DISTANCE, FORCE, UNIT } from "../../../base/keywords"
import type { Vector2 } from "../../../base/Vector2"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { MOVE_COLOR, MOVE_WIDTH, PHYSICAL_COLOR } from "../../../battle/previewColors"

import { ActionCard } from "../ActionCard"
import { DASH_LENGTH, DASH_SPEED } from "../movement/MoveCard"
import { hold, SHORT_TIME, travel } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { DamageType } from "../../../battle/DamageType"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How wide the line a charge cuts is, in meters. */
const CHARGE_WIDTH = 0.3

/** How far the slash of the catalog dashes at first, in meters, before the agility of the unit. */
const SLASH_LENGTH = 2

/** How much farther the slash goes each time it meets a unit, in meters, before the agility of the unit. */
const SLASH_EXTRA = 1

/** How far the slash goes at most, in meters, before the agility of the unit. */
const SLASH_MAX = 5

/** How many times the slash must be lengthened to cut twice. */
const SLASH_DOUBLE = 2

/** How wide the slash of the catalog cuts, in meters. */
const SLASH_WIDTH = 1

/** How long the area of the slash stays shown, in seconds. */
const SLASH_TIME = 0.15

/** A line of a width from a point to another. */
function band(from: Vector2, to: Vector2, width: number): Area {
    return Areas.line(from, to, width)
}

/** A dash through the units on its way, each of which takes a blow along the way. */
export const THRUST_CHARGE = new ActionCard("Charge d'estoc", [
    "Fonce de ", DASH_LENGTH, "×", AGILITE, " ", DISTANCE, " devant en traversant les ", UNIT.as("unités"), " : ", 1,
    "+", FORCE, " ", DamageType.PHYSICAL, " à chacune de celles sur le chemin.",
], Rarity.RARE, {
    use: function (ctx){
        const { battle, unit } = ctx
        const start = unit.position
        const length = DASH_LENGTH * unit.stats.move.value
        const through = battle.bodies.filter(body => body !== unit)
        const gone = travel(ctx, unit.direction, length, DASH_SPEED, false, through)
        // Rooted, it cuts where it stands: the whole length ahead.
        const to = gone.distance > 0 ? unit.position : start.plus(unit.direction.times(length))
        const area = band(start, to, CHARGE_WIDTH)
        battle.strike(unit, area, 1 + unit.stats.strength.value, DamageType.PHYSICAL)
        // Ending the dash inside a body, it is moved out of it, as the slash does.
        battle.unblock(unit)
        hold(battle, SHORT_TIME, [Previews.polygon(area, PHYSICAL_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const length = DASH_LENGTH * unit.stats.move.value
        const through = battle.bodies.filter(body => body !== unit)
        const trip = battle.moveSpot(unit, pose.position, pose.direction, length, through)
        const area = band(pose.position, trip.to, CHARGE_WIDTH)
        return Previews.still(
            { position: trip.to, direction: pose.direction },
            Previews.arrow([pose.position, trip.to], MOVE_WIDTH, MOVE_COLOR),
            Previews.body(unit, trip.to, pose.direction),
            ...Previews.strike([area], battle.fetch(area, unit)),
        )
    },
})


/**
 * How far the slash of a unit goes from a point along a direction, and how many times it was lengthened: it
 * starts short, and each time a unit lies on the distance it just gained, it gains more, up to a maximum.
 * Several units on the same stretch lengthen it once. Changes nothing: the slash and its preview both ask it.
 */
function slashReach(
    battle: Battle, unit: Unit, from: Vector2, direction: Vector2,
): { length: number, extensions: number } {
    const agility = unit.stats.move.value
    const farthest = SLASH_MAX * agility
    let length = SLASH_LENGTH * agility
    let scanned = 0
    let extensions = 0
    while(length < farthest){
        const stretch = band(from.plus(direction.times(scanned)), from.plus(direction.times(length)), SLASH_WIDTH)
        if(battle.fetch(stretch, unit).length === 0) break
        scanned = length
        length = Math.min(farthest, length + SLASH_EXTRA * agility)
        extensions++
    }
    return { length, extensions }
}

/** A dash through the units on its way, lengthened by the units it meets, and cutting twice when long enough. */
export const DEMON_SLASH = new ActionCard("Demon Slash", [
    "Fonce de ", SLASH_LENGTH, "×", AGILITE, " ", DISTANCE, " devant en traversant les ", UNIT.as("unités"),
    " et en tranchant sur ", SLASH_WIDTH, " ", DISTANCE, " de large : ", 1, "+", FORCE, " ", DamageType.PHYSICAL,
    " à chacune. Si une ", UNIT, " se trouve sur la distance ajoutée, le dash s'allonge encore de ", SLASH_EXTRA, "×",
    AGILITE, " ", DISTANCE, ", ", SLASH_MAX, "×", AGILITE, " ", DISTANCE, " au plus. Si le slash est allongé au moins ",
    SLASH_DOUBLE, " fois, inflige ", 1, "+", FORCE, " ", DamageType.PHYSICAL, " supplémentaires.",
], Rarity.EPIC, {
    use: function (ctx){
        const { battle, unit } = ctx
        const start = unit.position
        const { length, extensions } = slashReach(battle, unit, start, unit.direction)
        const through = battle.bodies.filter(body => body !== unit)
        const gone = travel(ctx, unit.direction, length, DASH_SPEED, false, through)
        // Rooted, it cuts where it stands: the whole length ahead.
        const to = gone.distance > 0 ? unit.position : start.plus(unit.direction.times(length))
        const area = band(start, to, SLASH_WIDTH)
        const times = extensions >= SLASH_DOUBLE ? 2 : 1
        battle.strike(unit, area, 1 + unit.stats.strength.value, DamageType.PHYSICAL, () => times)
        battle.unblock(unit)
        hold(battle, SLASH_TIME, [Previews.polygon(area, PHYSICAL_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const { length } = slashReach(battle, unit, pose.position, pose.direction)
        const through = battle.bodies.filter(body => body !== unit)
        const trip = battle.moveSpot(unit, pose.position, pose.direction, length, through)
        const area = band(pose.position, trip.to, SLASH_WIDTH)
        return Previews.still(
            { position: trip.to, direction: pose.direction },
            Previews.arrow([pose.position, trip.to], MOVE_WIDTH, MOVE_COLOR),
            Previews.body(unit, trip.to, pose.direction),
            ...Previews.strike([area], battle.fetch(area, unit)),
        )
    },
})
