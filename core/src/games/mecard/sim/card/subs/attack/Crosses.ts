import { ALLONGE, DISTANCE, FORCE, UNIT } from "../../../base/keywords"
import type { Indicator, Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Unit } from "../../../battle/Unit"
import { HAZARD_COLOR, NOTE_COLOR, PHYSICAL_COLOR } from "../../../battle/previewColors"
import { frenchNumber } from "../../../battle/words"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { label, polygon, still } from "../tools/previews"
import { centeredSegment, cross } from "../tools/areas"
import { Rarity } from "../../Rarity"
import { DamageType } from "../../../battle/DamageType"

/** How hard the units a blow reaches are shown, in a preview: a ring around each. */
function ringed(units: readonly Unit[]): Indicator[] {
    return units.map(hit => polygon({ kind: "circle", center: hit.position, radius: hit.radius }, HAZARD_COLOR))
}

/** The two segments of the cutting cross of the catalog: an X, crossing a meter ahead. */
const X_LENGTH = 2
const X_WIDTH = 0.4
const X_AHEAD = 1

function xAreas(pose: Pose, unit: Unit): Area[] {
    const stretch = unit.stats.meleeRange.value
    const center = pose.position.plus(pose.direction.times(X_AHEAD * stretch))
    return [
        centeredSegment(center, pose.direction.eighth(1), X_LENGTH * stretch, X_WIDTH),
        centeredSegment(center, pose.direction.eighth(-1), X_LENGTH * stretch, X_WIDTH),
    ]
}

/** An X ahead: each segment hurts what it crosses, so what stands at the crossing is hurt twice. */
export const CROSS_CUT = new ActionCard("Taille croisée", [
    "Taille en X, ", X_LENGTH, "×", ALLONGE, " ", DISTANCE, " par branche, croisé à ", X_AHEAD, "×", ALLONGE, " ", DISTANCE,
    " devant : ", 1, "+",
    FORCE, " ", DamageType.PHYSICAL, " par branche. Au croisement, deux fois.",
], Rarity.RARE, {
    use: function* ({ battle, unit }){
        const amount = 1 + unit.stats.strength.value
        const areas = xAreas(unit, unit)
        for(const area of areas) battle.strike(unit, area, amount, DamageType.PHYSICAL)
        yield* hold(battle, SHORT_TIME, areas.map(area => polygon(area, PHYSICAL_COLOR)))
    },
    preview: ({ battle, unit, pose }) => {
        const areas = xAreas(pose, unit)
        const touched = areas.flatMap(area => battle.unitsIn(area, unit))
        return still(pose, ...areas.map(area => polygon(area, PHYSICAL_COLOR)), ...ringed(touched))
    },
})


/** The bars of the fishing cross, in meters, and how far ahead its center lies. */
const FISHING_BAR = 2
const FISHING_WIDTH = 0.5
const FISHING_AHEAD = 1.5

/** How much gold a kill of the fishing gives, and the share of its hearts under which a unit is hurt harder. */
const FISHING_GOLD = 10
const FISHING_LOW = 0.5

function fishingCenter(pose: Pose, unit: Unit) {
    return pose.position.plus(pose.direction.times(FISHING_AHEAD * unit.stats.meleeRange.value))
}

/** Is a unit under the share of its hearts at which the fishing hurts twice as much? */
function weakened(target: Unit): boolean {
    return target.life < target.hearts.maxHearts * FISHING_LOW
}

/**
 * A blow in a cross ahead: harder on whoever is low. Kills pull its unit to the center of the cross, give
 * gold, and bring another one in the hand.
 */
export const FISHING: ActionCard = new ActionCard("Pêche", [
    "Frappe en croix à ", frenchNumber(FISHING_AHEAD), "×", ALLONGE, " ", DISTANCE, " devant : ", 1, "+", FORCE, " ",
    DamageType.PHYSICAL, ", le double sous la moitié des cœurs. Si une ", UNIT, " meurt : se téléporte au centre, gagne ",
    FISHING_GOLD,
    " or par mort, et reprend une Pêche en main.",
], Rarity.EPIC, {
    use: function* ({ battle, unit }){
        const areas = cross(
            fishingCenter(unit, unit), unit.direction, FISHING_BAR * unit.stats.meleeRange.value, FISHING_WIDTH,
        )
        const amount = 1 + unit.stats.strength.value
        const hit = battle.strikeMany(
            unit, areas, amount, DamageType.PHYSICAL, target => weakened(target) ? 2 : 1,
        )
        const killed = hit.filter(target => !target.alive).length
        yield* hold(battle, SHORT_TIME, areas.map(area => polygon(area, PHYSICAL_COLOR)))
        if(killed === 0) return
        battle.blink(unit, fishingCenter(unit, unit))
        battle.giveGold(unit, FISHING_GOLD * killed)
        battle.giveCard(unit, FISHING)
    },
    preview: ({ battle, unit, pose }) => {
        const areas = cross(
            fishingCenter(pose, unit), pose.direction, FISHING_BAR * unit.stats.meleeRange.value, FISHING_WIDTH,
        )
        const amount = 1 + unit.stats.strength.value
        const touched = [...new Set(areas.flatMap(area => battle.unitsIn(area, unit)))]
        const dies = touched.some(target => target.life <= amount * (weakened(target) ? 2 : 1))
        const extra: Indicator[] = []
        if(dies) extra.push(label(fishingCenter(pose, unit), "téléportation", NOTE_COLOR))
        return still(pose, ...areas.map(area => polygon(area, PHYSICAL_COLOR)), ...ringed(touched), ...extra)
    },
})


/** The waves of the scythe of death at most, the first included. */
const WAVES = 4

/** The reach of the scythe of death: the crescent of the scythe. */
const REAP_INNER = 1
const REAP_OUTER = 2
const REAP_COS_HALF = 0.5

/** How far a wave on the whole map reaches, in meters: farther than any arena. */
const EVERYWHERE = 1000

function reapArea(pose: Pose, unit: Unit): Area {
    const stretch = unit.stats.meleeRange.value
    return {
        kind: "crescent", center: pose.position, direction: pose.direction,
        inner: REAP_INNER * stretch, radius: REAP_OUTER * stretch, cosHalf: REAP_COS_HALF,
    }
}

/** A scythe whose every kill makes the next wave hurt everyone, itself apart. */
export const DEATH_SCYTHE = new ActionCard("Faux de la mort", [
    "Fauche en arc comme la Faux (", ALLONGE, " comprise) : ", 1, "+", FORCE, " ", DamageType.PHYSICAL, ". Si une ", UNIT,
    " meurt, la même chose frappe toutes les ", UNIT.as("unités"), " de la carte, et recommence tant qu'il y a un mort, ",
    WAVES, " vagues au plus.",
], Rarity.LEGENDARY, {
    use: function* ({ battle, unit }){
        const amount = 1 + unit.stats.strength.value
        let hit = battle.strike(unit, reapArea(unit, unit), amount, DamageType.PHYSICAL)
        yield* hold(battle, SHORT_TIME, [polygon(reapArea(unit, unit), PHYSICAL_COLOR)])
        for(let wave = 1; wave < WAVES && hit.some(target => !target.alive); wave++){
            const everyone: Area = { kind: "circle", center: unit.position, radius: EVERYWHERE }
            hit = battle.strike(unit, everyone, amount, DamageType.PHYSICAL)
            yield* hold(battle, SHORT_TIME)
        }
    },
    preview: ({ battle, unit, pose }) => {
        const area = reapArea(pose, unit)
        const amount = 1 + unit.stats.strength.value
        const touched = battle.unitsIn(area, unit)
        const dies = touched.filter(target => target.life <= amount)
        const shown: Indicator[] = [polygon(area, PHYSICAL_COLOR), ...ringed(touched)]
        if(dies.length > 0){
            shown.push(...dies.map(target => label(target.position, "mort", NOTE_COLOR)))
            shown.push(label(pose.position, "vague 2", NOTE_COLOR))
        }
        return still(pose, ...shown)
    },
})
