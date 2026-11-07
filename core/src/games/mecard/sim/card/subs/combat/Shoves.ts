import type { Vector2 } from "../../../base/Vector2"
import { UNIT } from "../../../base/keywords"
import type { Action, Indicator, Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { CONTROL_COLOR, HAZARD_COLOR, MOVE_WIDTH, NOTE_COLOR, RANGE_COLOR } from "../../../battle/previewColors"
import { damage, meters } from "../../../battle/words"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME, travel, WORD_TIME } from "../tools/playing"
import { arrow, label, polygon, still } from "../tools/previews"
import { type Shove, shove, shoveAll } from "../tools/shoving"
import { Rarity } from "../../Rarity"

/** How far the projection of the catalog throws, in meters, before the range of the unit. */
const PROJECTION_DISTANCE = 2.5

/** How many hearts a projection stopped short takes, before the strength of the unit. */
const IMPACT_DAMAGE = 2

/** How far the projection reaches in front of the unit, in meters, and the cosine of half its angle. */
const PROJECTION_RADIUS = 1.5
const PROJECTION_COS_HALF = Math.SQRT1_2

/** How far the suction reaches around the unit, in meters. */
const SUCTION_RADIUS = 3

/** The reach of the catch, in meters before the range, its width, and the hearts it takes. */
const CATCH_LENGTH = 2.5
const CATCH_WIDTH = 0.5
const CATCH_DAMAGE = 1

/** How far the ram runs, in meters, before the mobility of the unit. */
const RAM_LENGTH = 2

/** The reach of the sling: ahead and behind, in meters before the range, and the width of each. */
const SLING_LENGTH = 2.5
const SLING_AHEAD_WIDTH = 0.5
const SLING_BEHIND_WIDTH = 0.7

/** How far the shock wave throws, in meters, before the range, and how far it reaches. */
const WAVE_DISTANCE = 1.5
const WAVE_RADIUS = 1.5

/** The size of the tide, in meters, and how far it carries what it covers. */
const TIDE_LENGTH = 4
const TIDE_WIDTH = 3
const TIDE_DISTANCE = 2

/** A segment ahead of a pose, from its center. */
function ahead(pose: Pose, length: number, width: number): Area {
    return { kind: "segment", from: pose.position, to: pose.position.plus(pose.direction.times(length)), width }
}

/** A segment behind a pose, from its center. */
function behind(pose: Pose, length: number, width: number): Area {
    return ahead({ position: pose.position, direction: pose.direction.opposite }, length, width)
}

/** What a shove would show: its zone is shown apart, here the way it goes and where it is stopped. */
function shoveShown(battle: Battle, one: Shove): Indicator[] {
    const trip = battle.travel(one.target, one.target.position, one.direction, one.distance, one.through ?? [])
    const shown: Indicator[] = [arrow([one.target.position, trip.to], MOVE_WIDTH, CONTROL_COLOR)]
    if(trip.distance < one.distance && (one.impact ?? 0) > 0){
        shown.push(label(trip.to, `impact ${one.impact}`, NOTE_COLOR))
    }
    return shown
}

/** An action shoving units of a zone, by the shoves it asks of a pose. */
function shoving(
    zone: (pose: Pose, range: number) => Area, shovesOf: (battle: Battle, unit: Unit, pose: Pose, hit: Unit[]) => Shove[],
): Action {
    return {
        use: function* ({ battle, unit }){
            const range = unit.stats.throwRange.value
            const hit = battle.unitsIn(zone(unit, range), unit)
            yield* shoveAll(shovesOf(battle, unit, unit, hit))
            yield* hold(battle, SHORT_TIME)
        },
        preview: ({ battle, unit, pose }) => {
            const range = unit.stats.throwRange.value
            const area = zone(pose, range)
            const hit = battle.unitsIn(area, unit)
            const shown = shovesOf(battle, unit, pose, hit).flatMap(one => shoveShown(battle, one))
            return still(pose, polygon(area, RANGE_COLOR), ...shown)
        },
    }
}

/** The impact of a shove of the catalog: a few hearts, the strength of the unit added. */
function impactOf(unit: Unit): number {
    return IMPACT_DAMAGE + unit.stats.strength.value
}

export const PROJECTION = new ActionCard("Projection", [
    "Projette chaque ", UNIT, " dans le secteur devant, à ", meters(PROJECTION_RADIUS), ", sur ", meters(PROJECTION_DISTANCE),
    " × la portée. Si elle percute un mur ou une ", UNIT, ", elles prennent ", damage(IMPACT_DAMAGE, "physical"), " + la force.",
], Rarity.RARE, shoving(
    (pose: Pose) => ({
        kind: "sector", center: pose.position, direction: pose.direction,
        radius: PROJECTION_RADIUS, cosHalf: PROJECTION_COS_HALF,
    }),
    (battle, unit, pose, hit) => hit.map(target => ({
        battle, by: unit, target,
        direction: pose.direction,
        distance: PROJECTION_DISTANCE * unit.stats.throwRange.value,
        impact: impactOf(unit),
        hurtsStruck: true,
    })),
))

/** The direction from a unit to a point, none when they are at the same spot. */
function toward(from: Vector2, to: Vector2): Vector2|null {
    return to.minus(from).normalized
}

export const SUCTION = new ActionCard("Aspiration", [
    "Tire chaque ", UNIT, " à ", meters(SUCTION_RADIUS), " autour jusqu'au contact. Aucun dégât.",
], Rarity.RARE, shoving(
    (pose: Pose) => ({ kind: "circle", center: pose.position, radius: SUCTION_RADIUS }),
    (battle, unit, pose, hit) => hit.flatMap(target => {
        const direction = toward(target.position, pose.position)
        if(!direction) return []
        return [{ battle, by: unit, target, direction, distance: target.position.distance(pose.position) }]
    }),
))

export const CATCH = new ActionCard("Attrapage", [
    "Ramène au contact devant chaque ", UNIT, " du couloir devant, sur ", meters(CATCH_LENGTH), " × la portée. ",
    damage(CATCH_DAMAGE, "physical"), " fixe.",
], Rarity.RARE, {
    use: function* ({ battle, unit }){
        const area = ahead(unit, CATCH_LENGTH * unit.stats.throwRange.value, CATCH_WIDTH)
        const spot = unit.position.plus(unit.direction.times(1))
        const hit = battle.unitsIn(area, unit)
        for(const target of hit){
            target.hearts.damage(CATCH_DAMAGE, "physical", unit)
            const direction = toward(target.position, spot)
            if(!direction) continue
            yield* shove({ battle, by: unit, target, direction, distance: target.position.distance(spot) })
        }
        yield* hold(battle, SHORT_TIME)
    },
    preview: ({ battle, unit, pose }) => {
        const area = ahead(pose, CATCH_LENGTH * unit.stats.throwRange.value, CATCH_WIDTH)
        const spot = pose.position.plus(pose.direction.times(1))
        const shown = battle.unitsIn(area, unit).map(target => arrow([target.position, spot], MOVE_WIDTH, CONTROL_COLOR))
        return still(pose, polygon(area, RANGE_COLOR), ...shown)
    },
})

export const BATTERING_RAM = new ActionCard("Bélier", [
    "Fonce de ", meters(RAM_LENGTH), " devant. La première ", UNIT, " rencontrée est projetée sur ", meters(PROJECTION_DISTANCE),
    " × la portée, avec ", damage(IMPACT_DAMAGE, "physical"), " + la force à l'impact.",
], Rarity.RARE, {
    use: function* (ctx){
        const { battle, unit } = ctx
        const length = RAM_LENGTH * unit.stats.move.value
        const gone = yield* travel(ctx, unit.direction, length)
        if(!gone.struck){
            yield* hold(battle, WORD_TIME, [label(unit.position, "personne percutée", NOTE_COLOR)])
            return
        }
        yield* shove({
            battle, by: unit, target: gone.struck, direction: unit.direction,
            distance: PROJECTION_DISTANCE * unit.stats.throwRange.value, impact: impactOf(unit), hurtsStruck: true,
        })
    },
    preview: ({ battle, unit, pose }) => {
        const length = RAM_LENGTH * unit.stats.move.value
        const trip = battle.travel(unit, pose.position, pose.direction, length)
        const run = arrow([pose.position, trip.to], MOVE_WIDTH, CONTROL_COLOR)
        const landing = { position: trip.to, direction: pose.direction }
        if(!trip.struck) return still(landing, run)
        const one: Shove = {
            battle, by: unit, target: trip.struck, direction: pose.direction,
            distance: PROJECTION_DISTANCE * unit.stats.throwRange.value, impact: impactOf(unit), hurtsStruck: true,
        }
        return still(landing, run, ...shoveShown(battle, one))
    },
})

export const SLING_CARD = new ActionCard("Fronde", [
    "Saisit la première ", UNIT, " devant, sur ", meters(SLING_LENGTH), " × la portée, et la lance derrière soi, ",
    "en la faisant passer à travers soi, jusqu'à ", meters(SLING_LENGTH), " × la portée de l'", UNIT, ". Impact : ",
    damage(IMPACT_DAMAGE, "physical"), " + la force.",
], Rarity.EPIC, (() => {
    const slung = (battle: Battle, unit: Unit, pose: Pose): Shove|null => {
        const reach = SLING_LENGTH * unit.stats.throwRange.value
        const first = battle.ray(unit, reach, pose).unit
        if(!first) return null
        const end = pose.position.minus(pose.direction.times(reach))
        const direction = toward(first.position, end)
        if(!direction) return null
        return {
            battle, by: unit, target: first, direction, distance: first.position.distance(end),
            impact: impactOf(unit), hurtsStruck: true, through: [unit],
        }
    }
    return {
        use: function* ({ battle, unit }){
            const one = slung(battle, unit, unit)
            if(!one){
                yield* hold(battle, WORD_TIME, [label(unit.position, "personne à saisir", NOTE_COLOR)])
                return
            }
            yield* shove(one)
        },
        preview: ({ battle, unit, pose }) => {
            const reach = SLING_LENGTH * unit.stats.throwRange.value
            const zones = [
                polygon(ahead(pose, reach, SLING_AHEAD_WIDTH), RANGE_COLOR),
                polygon(behind(pose, reach, SLING_BEHIND_WIDTH), HAZARD_COLOR),
            ]
            const one = slung(battle, unit, pose)
            return still(pose, ...zones, ...one ? shoveShown(battle, one) : [])
        },
    } satisfies Action
})())

export const SHOCK_WAVE = new ActionCard("Onde de choc", [
    "Projette chaque ", UNIT, " à ", meters(WAVE_RADIUS), " autour vers l'extérieur, sur ", meters(WAVE_DISTANCE),
    " × la portée. Impact : ", damage(IMPACT_DAMAGE, "physical"), " + la force.",
], Rarity.RARE, shoving(
    (pose: Pose) => ({ kind: "circle", center: pose.position, radius: WAVE_RADIUS }),
    (battle, unit, pose, hit) => hit.flatMap(target => {
        const direction = toward(pose.position, target.position)
        if(!direction) return []
        return [{
            battle, by: unit, target, direction, distance: WAVE_DISTANCE * unit.stats.throwRange.value,
            impact: impactOf(unit), hurtsStruck: true,
        }]
    }),
))

export const TIDE = new ActionCard("Marée", [
    "Fait avancer de ", meters(TIDE_DISTANCE), " chaque ", UNIT, " du rectangle de ", meters(TIDE_LENGTH), " sur ",
    meters(TIDE_WIDTH), " devant. Aucun dégât.",
], Rarity.RARE, shoving(
    (pose: Pose) => ahead(pose, TIDE_LENGTH, TIDE_WIDTH),
    (battle, unit, pose, hit) => hit.map(target => ({
        battle, by: unit, target, direction: pose.direction, distance: TIDE_DISTANCE,
    })),
))
