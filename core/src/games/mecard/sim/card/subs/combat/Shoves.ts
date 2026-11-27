import type { Vector2 } from "../../../base/Vector2"
import { AGILITE, DISTANCE, FORCE, PORTEE, UNIT } from "../../../base/keywords"
import type { Action, Pose } from "../../../battle/Action"
import type { Indicator } from "../../../battle/preview/Preview"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { CONTROL_COLOR, HAZARD_COLOR, MOVE_WIDTH, NOTE_COLOR, RANGE_COLOR } from "../../../battle/previewColors"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME, WORD_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { DamageType } from "../../../battle/DamageType"
import { VIOLENT_PUSH } from "../../../battle/mecanic/push/keyword"
import type { Shove } from "../../../battle/mecanic/push/shove"
import type { ViolentShove } from "../../../battle/mecanic/push/violent"
import { WALK } from "../../../battle/mecanic/walk/keyword"
import * as Pushing from "../../../battle/mecanic/push"
import * as Walk from "../../../battle/mecanic/walk"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How far the projection of the catalog throws, in meters, before the range of the unit. */
const PROJECTION_DISTANCE = 2.5

/** How many hearts a collision of a projection takes, before the strength of the unit. */
const IMPACT_DAMAGE = 2

/** How far the projection reaches in front of the unit, in meters, and the cosine of half its angle. */
const PROJECTION_RADIUS = 1.5 - UNIT_RADIUS
const PROJECTION_COS_HALF = Math.SQRT1_2

/** How far the suction reaches around the unit, in meters. */
const SUCTION_RADIUS = 3 - UNIT_RADIUS

/** The reach of the catch, in meters before the range, its width, and the hearts it takes. */
const CATCH_LENGTH = 2.5 - UNIT_RADIUS
const CATCH_WIDTH = 0.5
const CATCH_DAMAGE = 1

/** How far the ram runs, in meters, before the agility of the unit. */
const RAM_LENGTH = 2

/** The reach of the sling: ahead and behind, in meters before the range, and the width of each. */
const SLING_LENGTH = 2.5 - UNIT_RADIUS
const SLING_AHEAD_WIDTH = 0.5
const SLING_BEHIND_WIDTH = 0.7

/** How far the shock wave throws, in meters, before the range, and how far it reaches. */
const WAVE_DISTANCE = 1.5
const WAVE_RADIUS = 1.5 - UNIT_RADIUS

/** The size of the tide, in meters, and how far it carries what it covers. */
const TIDE_LENGTH = 4 - UNIT_RADIUS
const TIDE_WIDTH = 3
const TIDE_DISTANCE = 2

/** A segment ahead of a unit at a pose, from the edge of its body. */
function ahead(unit: Unit, pose: Pose, length: number, width: number): Area {
    const from = unit.muzzle(pose)
    return Areas.line(from, from.plus(pose.direction.times(length)), width)
}

/** A segment behind a unit at a pose, from the edge of its body. */
function behind(unit: Unit, pose: Pose, length: number, width: number): Area {
    const from = unit.muzzle(pose, pose.direction.opposite)
    return Areas.line(from, from.minus(pose.direction.times(length)), width)
}

/**
 * An action shoving units of a zone, one after the other, by the shoves it asks of a pose.
 *
 * @param play - How each shove is played: simply, or violently.
 * @param shown - What each shove shows in a preview.
 */
function shoving<T extends Shove>(
    zone: (unit: Unit, pose: Pose) => Area, shovesOf: (battle: Battle, unit: Unit, pose: Pose, hit: Unit[]) => T[],
    play: (one: T) => void, shown: (battle: Battle, one: T) => Indicator[],
): Action {
    return {
        use: function ({ battle, unit }){
            const hit = battle.fetch(zone(unit, unit), unit)
            for(const one of shovesOf(battle, unit, unit, hit)) play(one)
            hold(battle, SHORT_TIME)
        },
        preview: ({ battle, unit, pose }) => {
            const area = zone(unit, pose)
            const hit = battle.fetch(area, unit)
            const shoves = shovesOf(battle, unit, pose, hit).flatMap(one => shown(battle, one))
            return Previews.still(pose, Previews.polygon(area, RANGE_COLOR), ...shoves)
        },
    }
}

/** An action shoving violently the units of a zone. */
function shovingViolently(
    zone: (unit: Unit, pose: Pose) => Area,
    shovesOf: (battle: Battle, unit: Unit, pose: Pose, hit: Unit[]) => ViolentShove[],
): Action {
    return shoving(zone, shovesOf, Pushing.shoveViolently, Pushing.violentShoveShown)
}

/** An action shoving the units of a zone, hurting nobody. */
function shovingSimply(
    zone: (unit: Unit, pose: Pose) => Area,
    shovesOf: (battle: Battle, unit: Unit, pose: Pose, hit: Unit[]) => Shove[],
): Action {
    return shoving(zone, shovesOf, Pushing.shove, Pushing.shoveShown)
}

/** What a collision of a shove of the catalog takes: a few hearts, the strength of the unit added. */
function impactOf(unit: Unit): number {
    return IMPACT_DAMAGE + unit.stats.strength.value
}

export const PROJECTION = new ActionCard("Projection", [
    VIOLENT_PUSH.as("Pousse violemment"), " chaque ", UNIT, " dans le secteur devant, à ", PROJECTION_RADIUS, " ",
    DISTANCE, ", sur ", PROJECTION_DISTANCE, "×", PORTEE, " ", DISTANCE, ". Choc : ", IMPACT_DAMAGE, "+", FORCE, " ",
    DamageType.PHYSICAL, ".",
], Rarity.RARE, shovingViolently(
    (unit, pose) => Areas.arc(unit.muzzle(pose), pose.direction, PROJECTION_RADIUS, PROJECTION_COS_HALF),
    (battle, unit, pose, hit) => hit.map(target => ({
        battle, by: unit, target,
        direction: pose.direction,
        distance: PROJECTION_DISTANCE * unit.stats.throwRange.value,
        damage: impactOf(unit),
    })),
))

/** The direction from a unit to a point, none when they are at the same spot. */
function toward(from: Vector2, to: Vector2): Vector2|null {
    return to.minus(from).normalized
}

export const SUCTION = new ActionCard("Aspiration", [
    "Tire chaque ", UNIT, " à ", SUCTION_RADIUS, " ", DISTANCE, " autour jusqu'au contact. Aucun dégât.",
], Rarity.RARE, shovingSimply(
    (unit, pose) => unit.around(SUCTION_RADIUS, pose),
    (battle, unit, pose, hit) => hit.flatMap(target => {
        const direction = toward(target.position, pose.position)
        if(!direction) return []
        return [{ battle, by: unit, target, direction, distance: target.position.distance(pose.position) }]
    }),
))

/** Where the catch brings what it takes, from a pose: at the contact of the unit, a body ahead of its edge. */
function catchSpot(unit: Unit, pose: Pose): Vector2 {
    return unit.muzzle(pose).plus(pose.direction.times(1 - UNIT_RADIUS))
}

export const CATCH = new ActionCard("Attrapage", [
    "Ramène au contact devant chaque ", UNIT, " du couloir devant, sur ", CATCH_LENGTH, "×", PORTEE, " ", DISTANCE, ". ",
    CATCH_DAMAGE, " ", DamageType.PHYSICAL, " fixes.",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        const area = ahead(unit, unit, CATCH_LENGTH * unit.stats.throwRange.value, CATCH_WIDTH)
        const spot = catchSpot(unit, unit)
        const hit = battle.fetch(area, unit)
        for(const target of hit){
            target.hearts.damage(CATCH_DAMAGE, DamageType.PHYSICAL, unit)
            const direction = toward(target.position, spot)
            if(!direction) continue
            Pushing.shove({ battle, by: unit, target, direction, distance: target.position.distance(spot) })
        }
        hold(battle, SHORT_TIME)
    },
    preview: ({ battle, unit, pose }) => {
        const area = ahead(unit, pose, CATCH_LENGTH * unit.stats.throwRange.value, CATCH_WIDTH)
        const spot = catchSpot(unit, pose)
        const shown = battle.fetch(area, unit).map(target => Previews.arrow([target.position, spot], MOVE_WIDTH, CONTROL_COLOR))
        return Previews.still(pose, Previews.polygon(area, RANGE_COLOR), ...shown)
    },
})

/** The violent push the battering ram gives what it runs into, from where it stops and the way it ran. */
function rammed(battle: Battle, unit: Unit, target: Unit, stop: Pose): ViolentShove {
    return {
        battle, by: unit, target, direction: Pushing.knockedWay(target, stop.position, stop.direction),
        distance: PROJECTION_DISTANCE * unit.stats.throwRange.value, damage: impactOf(unit),
    }
}

export const BATTERING_RAM = new ActionCard("Bélier", [
    WALK.as("Fonce"), " de ", RAM_LENGTH, "×", AGILITE, " ", DISTANCE, " devant. La première ", UNIT, " rencontrée est ",
    VIOLENT_PUSH.as("poussée violemment"), " sur ", PROJECTION_DISTANCE, "×", PORTEE, " ", DISTANCE,
    ", dans l'axe du choc. Choc : ", IMPACT_DAMAGE, "+", FORCE, " ", DamageType.PHYSICAL, ".",
], Rarity.RARE, {
    use: function (ctx){
        const { battle, unit } = ctx
        const length = RAM_LENGTH * unit.stats.move.value
        const gone = Walk.travel(ctx, unit.direction, length)
        if(!gone.struck){
            hold(battle, WORD_TIME, [Previews.label(unit.position, "personne percutée", NOTE_COLOR)])
            return
        }
        Pushing.shoveViolently(rammed(battle, unit, gone.struck, unit))
    },
    preview: ({ battle, unit, pose }) => {
        const length = RAM_LENGTH * unit.stats.move.value
        const trip = Walk.spot(battle, unit, pose.position, pose.direction, length)
        const run = Previews.arrow([pose.position, trip.to], MOVE_WIDTH, CONTROL_COLOR)
        const landing = { position: trip.to, direction: pose.direction }
        const disc = Previews.body(unit, trip.to, pose.direction)
        if(!trip.struck) return Previews.still(landing, run, disc)
        const pushed = Pushing.violentShoveShown(battle, rammed(battle, unit, trip.struck, landing))
        return Previews.still(landing, run, disc, ...pushed)
    },
})

export const SLING_CARD = new ActionCard("Fronde", [
    "Saisit la première ", UNIT, " devant, sur ", SLING_LENGTH, "×", PORTEE, " ", DISTANCE, ", et la ",
    VIOLENT_PUSH.as("pousse violemment"), " derrière soi, en la faisant passer à travers soi, jusqu'à ",
    SLING_LENGTH, "×", PORTEE, " ", DISTANCE, " de l'", UNIT, ". Choc : ", IMPACT_DAMAGE, "+", FORCE, " ",
    DamageType.PHYSICAL, ".",
], Rarity.EPIC, (() => {
    const slung = (battle: Battle, unit: Unit, pose: Pose): ViolentShove|null => {
        const reach = SLING_LENGTH * unit.stats.throwRange.value
        const first = battle.ray(unit, reach, pose).unit
        if(!first) return null
        const end = unit.muzzle(pose, pose.direction.opposite).minus(pose.direction.times(reach))
        const direction = toward(first.position, end)
        if(!direction) return null
        return {
            battle, by: unit, target: first, direction, distance: first.position.distance(end),
            damage: impactOf(unit), through: [unit],
        }
    }
    return {
        use: function ({ battle, unit }){
            const one = slung(battle, unit, unit)
            if(!one){
                hold(battle, WORD_TIME, [Previews.label(unit.position, "personne à saisir", NOTE_COLOR)])
                return
            }
            Pushing.shoveViolently(one)
        },
        preview: ({ battle, unit, pose }) => {
            const reach = SLING_LENGTH * unit.stats.throwRange.value
            const zones = [
                Previews.polygon(ahead(unit, pose, reach, SLING_AHEAD_WIDTH), RANGE_COLOR),
                Previews.polygon(behind(unit, pose, reach, SLING_BEHIND_WIDTH), HAZARD_COLOR),
            ]
            const one = slung(battle, unit, pose)
            return Previews.still(pose, ...zones, ...one ? Pushing.violentShoveShown(battle, one) : [])
        },
    } satisfies Action
})())

export const SHOCK_WAVE = new ActionCard("Onde de choc", [
    VIOLENT_PUSH.as("Pousse violemment"), " vers l'extérieur chaque ", UNIT, " à ", WAVE_RADIUS, " ", DISTANCE,
    " autour, sur ", WAVE_DISTANCE, "×", PORTEE, " ", DISTANCE, ". Choc : ", IMPACT_DAMAGE, "+", FORCE, " ",
    DamageType.PHYSICAL, ".",
], Rarity.RARE, shovingViolently(
    (unit, pose) => unit.around(WAVE_RADIUS, pose),
    (battle, unit, pose, hit) => hit.flatMap(target => {
        const direction = toward(pose.position, target.position)
        if(!direction) return []
        return [{
            battle, by: unit, target, direction, distance: WAVE_DISTANCE * unit.stats.throwRange.value,
            damage: impactOf(unit),
        }]
    }),
))

export const TIDE = new ActionCard("Marée", [
    "Fait avancer de ", TIDE_DISTANCE, " ", DISTANCE, " chaque ", UNIT, " du rectangle de ", TIDE_LENGTH, " ", DISTANCE, " sur ",
    TIDE_WIDTH, " ", DISTANCE, " devant. Aucun dégât.",
], Rarity.RARE, shovingSimply(
    (unit, pose) => ahead(unit, pose, TIDE_LENGTH, TIDE_WIDTH),
    (battle, unit, pose, hit) => hit.map(target => ({
        battle, by: unit, target, direction: pose.direction, distance: TIDE_DISTANCE,
    })),
))
