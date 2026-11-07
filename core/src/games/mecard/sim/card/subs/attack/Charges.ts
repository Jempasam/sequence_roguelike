import { UNIT } from "../../../base/keywords"
import type { Vector2 } from "../../../base/Vector2"
import type { Indicator, Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Unit } from "../../../battle/Unit"
import { HAZARD_COLOR, MOVE_COLOR, MOVE_WIDTH, PHYSICAL_COLOR } from "../../../battle/previewColors"
import { blowDamage, meters } from "../../../battle/words"

import { ActionCard } from "../ActionCard"
import { DASH_LENGTH, DASH_SPEED } from "../movement/MoveCard"
import { hold, SHORT_TIME, travel } from "../tools/playing"
import { arrow, polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"

/** How wide the line a charge cuts is, in meters. */
const CHARGE_WIDTH = 0.3

/** What the slash of the catalog blinks by, in meters, before the mobility of the unit: half a step. */
const SLASH_BLINK = 1

/** How wide the slash of the catalog cuts, in meters. */
const SLASH_WIDTH = 1

/** How many blinks the slash of the catalog makes at most, the first included. */
const SLASH_BLINKS = 3

/** How long a blink of the slash takes to fade, in seconds. */
const SLASH_TIME = 0.15

function ringed(units: readonly Unit[]): Indicator[] {
    return units.map(hit => polygon({ kind: "circle", center: hit.position, radius: hit.radius }, HAZARD_COLOR))
}

/** A line of a width from a point to another. */
function band(from: Vector2, to: Vector2, width: number): Area {
    return { kind: "segment", from, to, width }
}

/** A dash through the units on its way, each of which takes a blow along the way. */
export const THRUST_CHARGE = new ActionCard("Charge d'estoc", [
    "Fonce de ", meters(DASH_LENGTH), " devant en traversant les ", UNIT.as("unités"), " : ", blowDamage(1),
    " + la force à chacune de celles sur le chemin.",
], Rarity.RARE, {
    use: function* (ctx){
        const { battle, unit } = ctx
        const start = unit.position
        const length = DASH_LENGTH * unit.stats.move.value
        const through = battle.bodies.filter(body => body !== unit)
        const gone = yield* travel(ctx, unit.direction, length, DASH_SPEED, false, through)
        // Rooted, it cuts where it stands: the whole length ahead.
        const to = gone.distance > 0 ? unit.position : start.plus(unit.direction.times(length))
        const area = band(start, to, CHARGE_WIDTH)
        battle.strike(unit, area, 1 + unit.stats.strength.value, "physical")
        yield* hold(battle, SHORT_TIME, [polygon(area, PHYSICAL_COLOR)])
    },
    preview: ({ battle, unit, pose }) => {
        const length = DASH_LENGTH * unit.stats.move.value
        const through = battle.bodies.filter(body => body !== unit)
        const trip = battle.travel(unit, pose.position, pose.direction, length, through)
        const area = band(pose.position, trip.to, CHARGE_WIDTH)
        return still(
            { position: trip.to, direction: pose.direction },
            arrow([pose.position, trip.to], MOVE_WIDTH, MOVE_COLOR), polygon(area, PHYSICAL_COLOR),
            ...ringed(battle.unitsIn(area, unit)),
        )
    },
})


/** Where the blinks of a slash go, from a pose, with the units each cuts: as far as the room and the count allow. */
function slashes(battle: Battle, unit: Unit, pose: Pose): { to: Vector2, area: Area, hit: Unit[] }[] {
    const blinks: { to: Vector2, area: Area, hit: Unit[] }[] = []
    const cut = new Set<Unit>()
    let at = pose.position
    let length = SLASH_BLINK * unit.stats.move.value
    for(let count = 0; count < SLASH_BLINKS; count++){
        const to = at.plus(pose.direction.times(length))
        if(!battle.free(to, unit)) break
        const area = band(at, to, SLASH_WIDTH)
        // A unit is cut once, by the first blink to reach it.
        const hit = battle.unitsIn(area, unit).filter(other => !cut.has(other))
        for(const other of hit) cut.add(other)
        blinks.push({ to, area, hit })
        if(hit.length === 0) break
        at = to
        length = hit.length * SLASH_BLINK * unit.stats.move.value
    }
    return blinks
}

/** A slash blinking forward, again and farther for each unit it cut: three blinks at most. */
export const DEMON_SLASH = new ActionCard("Demon Slash", [
    "Se téléporte de ", meters(SLASH_BLINK), " devant en tranchant sur ", meters(SLASH_WIDTH), " de large : ",
    blowDamage(1), " + la force. Pour chaque ", UNIT, " touchée, recommence, ", meters(SLASH_BLINK),
    " plus loin chacune, ", String(SLASH_BLINKS), " fois au plus.",
], Rarity.EPIC, {
    use: function* ({ battle, unit }){
        const amount = 1 + unit.stats.strength.value
        let length = SLASH_BLINK * unit.stats.move.value
        const cut = new Set<Unit>()
        for(let count = 0; count < SLASH_BLINKS && unit.alive; count++){
            const from = unit.position
            const to = from.plus(unit.direction.times(length))
            const area = band(from, to, SLASH_WIDTH)
            // Rooted or blocked, it cuts the same: the blink alone is lost.
            battle.blink(unit, to)
            const hit = battle.strike(unit, area, amount, "physical", other => cut.has(other) ? 0 : 1)
            for(const other of hit) cut.add(other)
            yield* hold(battle, SLASH_TIME, [polygon(area, PHYSICAL_COLOR)])
            if(hit.length === 0) break
            length = hit.length * SLASH_BLINK * unit.stats.move.value
        }
    },
    preview: ({ battle, unit, pose }) => {
        const steps = slashes(battle, unit, pose)
        const last = steps.length > 0 ? steps[steps.length - 1].to : pose.position
        return still(
            { position: last, direction: pose.direction },
            ...steps.map(step => polygon(step.area, PHYSICAL_COLOR)),
            ...steps.flatMap(step => ringed(step.hit)),
        )
    },
})
