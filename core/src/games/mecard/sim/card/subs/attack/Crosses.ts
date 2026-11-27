import { ALLONGE, DISTANCE, FEBRILE, FORCE, UNIT } from "../../../base/keywords"
import { SHOCKWAVE_LOOK, SLASH_LOOK, THRUST_LOOK } from "../tools/blowLooks"
import type { Pose } from "../../../battle/Action"
import type { Indicator } from "../../../battle/preview/Preview"
import type { Area } from "../../../battle/Area"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { NOTE_COLOR, PHYSICAL_COLOR } from "../../../battle/previewColors"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { centeredSegment, cross } from "../tools/areas"
import { TELEPORT } from "../../../battle/mecanic/teleport/keyword"
import * as Teleport from "../../../battle/mecanic/teleport"
import { Rarity } from "../../Rarity"
import { DamageType } from "../../../battle/DamageType"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** The two segments of the cutting cross of the catalog: an X, crossing a meter ahead. */
const X_LENGTH = 2
const X_WIDTH = 0.4
const X_AHEAD = 1 - UNIT_RADIUS

function xAreas(pose: Pose, unit: Unit): Area[] {
    const stretch = unit.stats.meleeRange.value
    const center = unit.muzzle(pose).plus(pose.direction.times(X_AHEAD * stretch))
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
    use: function ({ battle, unit }){
        const amount = 1 + unit.stats.strength.value
        const areas = xAreas(unit, unit)
        for(const area of areas) battle.strike(unit, area, amount, DamageType.PHYSICAL, () => 1, THRUST_LOOK)
        hold(battle, SHORT_TIME, areas.map(area => Previews.polygon(area, PHYSICAL_COLOR)))
    },
    preview: ({ battle, unit, pose }) => {
        const areas = xAreas(pose, unit)
        const touched = areas.flatMap(area => battle.fetch(area, unit))
        return Previews.still(pose, ...Previews.strike(areas, touched))
    },
})


/** The bars of the fishing cross, in meters, and how far ahead its center lies. */
const FISHING_BAR = 2
const FISHING_WIDTH = 0.5
const FISHING_AHEAD = 1.5 - UNIT_RADIUS

/** How much gold a kill of the fishing gives. */
const FISHING_GOLD = 10

function fishingCenter(pose: Pose, unit: Unit) {
    return unit.muzzle(pose).plus(pose.direction.times(FISHING_AHEAD * unit.stats.meleeRange.value))
}

/**
 * A blow in a cross ahead: twice as hard on the feverish. Kills pull its unit to the center of the cross, give
 * gold, and bring another one in the hand.
 */
export const FISHING: ActionCard = new ActionCard("Pêche", [
    "Frappe en croix à ", FISHING_AHEAD, "×", ALLONGE, " ", DISTANCE, " devant : ", 1, "+", FORCE, " ",
    DamageType.PHYSICAL, ", le double sur une ", UNIT, " ", FEBRILE, ". Si une ", UNIT, " meurt : ",
    TELEPORT.as("se téléporte"), " au centre, gagne ", FISHING_GOLD,
    " or par mort, et reprend une Pêche en main.",
], Rarity.EPIC, {
    use: function ({ battle, unit }){
        const areas = cross(
            fishingCenter(unit, unit), unit.direction, FISHING_BAR * unit.stats.meleeRange.value, FISHING_WIDTH,
        )
        const amount = 1 + unit.stats.strength.value
        const hit = battle.strikeMany(
            unit, areas, amount, DamageType.PHYSICAL, target => target.feverish ? 2 : 1, THRUST_LOOK,
        )
        const killed = hit.filter(target => !target.alive).length
        hold(battle, SHORT_TIME, areas.map(area => Previews.polygon(area, PHYSICAL_COLOR)))
        if(killed === 0) return
        Teleport.teleport(battle, unit, fishingCenter(unit, unit))
        battle.giveGold(unit, FISHING_GOLD * killed)
        battle.giveCard(unit, FISHING)
    },
    preview: ({ battle, unit, pose }) => {
        const areas = cross(
            fishingCenter(pose, unit), pose.direction, FISHING_BAR * unit.stats.meleeRange.value, FISHING_WIDTH,
        )
        const amount = 1 + unit.stats.strength.value
        const touched = [...new Set(areas.flatMap(area => battle.fetch(area, unit)))]
        const dies = touched.some(target => target.life <= amount * (target.feverish ? 2 : 1))
        const extra: Indicator[] = []
        if(dies) extra.push(Previews.label(fishingCenter(pose, unit), "téléportation", NOTE_COLOR))
        return Previews.still(pose, ...Previews.strike(areas, touched), ...extra)
    },
})


/** The waves of the scythe of death at most, the first included. */
const WAVES = 4

/** The reach of the scythe of death: the crescent of the scythe. */
const REAP_INNER = 1 - UNIT_RADIUS
const REAP_OUTER = 2 - UNIT_RADIUS
const REAP_COS_HALF = 0.5

/** How far a wave on the whole map reaches, in meters: farther than any arena. */
const EVERYWHERE = 1000

function reapArea(pose: Pose, unit: Unit): Area {
    const stretch = unit.stats.meleeRange.value
    return Areas.crescent(unit.muzzle(pose), pose.direction, REAP_INNER * stretch, REAP_OUTER * stretch, REAP_COS_HALF)
}

/** A scythe whose every kill makes the next wave hurt everyone, itself apart. */
export const DEATH_SCYTHE = new ActionCard("Faux de la mort", [
    "Fauche en arc comme la Faux (", ALLONGE, " comprise) : ", 1, "+", FORCE, " ", DamageType.PHYSICAL, ". Si une ", UNIT,
    " meurt, la même chose frappe toutes les ", UNIT.as("unités"), " de la carte, et recommence tant qu'il y a un mort, ",
    WAVES, " vagues au plus.",
], Rarity.LEGENDARY, {
    use: function ({ battle, unit }){
        const amount = 1 + unit.stats.strength.value
        let hit = battle.strike(unit, reapArea(unit, unit), amount, DamageType.PHYSICAL, () => 1, SLASH_LOOK)
        hold(battle, SHORT_TIME, [Previews.polygon(reapArea(unit, unit), PHYSICAL_COLOR)])
        for(let wave = 1; wave < WAVES && hit.some(target => !target.alive); wave++){
            const everyone: Area = Areas.circle(unit.position, EVERYWHERE)
            hit = battle.strike(unit, everyone, amount, DamageType.PHYSICAL, () => 1, SHOCKWAVE_LOOK)
            hold(battle, SHORT_TIME)
        }
    },
    preview: ({ battle, unit, pose }) => {
        const area = reapArea(pose, unit)
        const amount = 1 + unit.stats.strength.value
        const touched = battle.fetch(area, unit)
        const dies = touched.filter(target => target.life <= amount)
        const shown: Indicator[] = Previews.strike([area], touched)
        if(dies.length > 0){
            shown.push(...dies.map(target => Previews.label(target.position, "mort", NOTE_COLOR)))
            shown.push(Previews.label(pose.position, "vague 2", NOTE_COLOR))
        }
        return Previews.still(pose, ...shown)
    },
})
