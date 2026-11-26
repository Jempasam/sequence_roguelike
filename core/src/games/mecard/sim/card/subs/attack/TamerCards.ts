import { DISTANCE, HEAL, HEART, UNIT, BATTLE_ROUND } from "../../../base/keywords"
import { CLAWS_LOOK } from "../tools/blowLooks"
import type { Action } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import { DamageType } from "../../../battle/DamageType"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { frenchNumber, HeartCount } from "../../../battle/words"
import { NOTE_COLOR, PHYSICAL_COLOR, RANGE_COLOR } from "../../../battle/previewColors"
import * as Previews from "../../../battle/preview/Previews"
import { Heart } from "../../../heart/Heart"
import { SHIELD_HEART } from "../../../heart/subs/ShieldHeartKind"
import { Strength } from "../../../process/subs/Strength"
import { isStuffed, stuffed } from "../../../process/subs/Taxidermy"
import { DODGE } from "../../../status/subs/Dodge"
import { ROOTED } from "../../../status/subs/Rooted"

import { Rarity } from "../../Rarity"
import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { ahead, nearest, onFirstAhead, onSelf, ring } from "../tools/targeting"
import * as Pushing from "../../../battle/mecanic/push"
import * as Summons from "../../../battle/mecanic/summon"

/** Reaches, in meters, of the blows and the lines of the cards of this file. */
const AUTOPSY_LENGTH = 1.1 - UNIT_RADIUS
const WHIP_LENGTH = 1.65 - UNIT_RADIUS
const BLOW_WIDTH = 0.4
const MUZZLE_LENGTH = 3.65
const MUZZLE_WIDTH = 0.6
const LURE_RANGE = 5
const LURE_FAR = 2
const LURE_NEAR = 1
const TENDING_RANGE = 3.65

/** How much a blow takes before the bonus of the unit. */
const BLOW_DAMAGE = 2

/** What is done once the blow landed: to whom, and whether it was feverish before it. */
type Aftermath = (battle: Battle, unit: Unit, target: Unit, wasFeverish: boolean) => void

/** A blow on the first unit ahead only, then something done to it. */
function blowing(length: number, after: Aftermath, what: string): Action {
    return {
        use: function ({ battle, unit }){
            const area = ahead(unit, unit, length, BLOW_WIDTH)
            const target = nearest(battle.fetch(area, unit), unit.position)
            if(target){
                const wasFeverish = target.feverish
                const damage = BLOW_DAMAGE + unit.stats.strength.value
                const only = (other: Unit): number => other === target ? 1 : 0
                battle.strike(unit, area, damage, DamageType.PHYSICAL, only, CLAWS_LOOK)
                after(battle, unit, target, wasFeverish)
            }
            hold(battle, SHORT_TIME, [Previews.polygon(area, PHYSICAL_COLOR)])
        },
        preview: ({ battle, unit, pose }) => {
            const area = ahead(unit, pose, length, BLOW_WIDTH)
            const target = nearest(battle.fetch(area, unit), pose.position)
            const shown = target ? [ring(target), Previews.label(target.position, what, NOTE_COLOR)] : []
            return Previews.still(pose, Previews.polygon(area, RANGE_COLOR), ...shown)
        },
    }
}

/** The bodies of a unit that are stuffed and still stand. */
function stuffedBodies(battle: Battle, owner: Unit): Unit[] {
    return Summons.summonsOf(battle, owner).filter(body => isStuffed(body) && body.alive)
}

export const AUTOPSY = new ActionCard("Autopsie", [
    "Poignarde la première ", UNIT, " sur ", frenchNumber(AUTOPSY_LENGTH), " ", DISTANCE, " devant : 2+force dégâts physiques. ",
    "Si elle meurt, elle est empaillée : elle combat pour toi avec la moitié de ses ", HEART.as("cœurs"), ".",
], Rarity.RARE, blowing(AUTOPSY_LENGTH, (battle, unit, target) => {
    if(!target.alive) stuffed(battle, unit, target)
}, "autopsie"))

export const WHIP = new ActionCard("Coup de fouet", [
    "Frappe la première ", UNIT, " sur ", frenchNumber(WHIP_LENGTH), " ", DISTANCE, " devant : 2+force dégâts physiques. ",
    "Si elle était fébrile, elle est étourdie.",
], Rarity.COMMON, blowing(WHIP_LENGTH, (battle, _unit, target, wasFeverish) => {
    if(wasFeverish && target.alive) battle.stun(target)
}, "coup de fouet"))

export const LURE = new ActionCard("Appeau", [
    "Attire à ", LURE_NEAR, " ", DISTANCE, " devant toi l'", UNIT, " ennemie fébrile la plus proche, à ", LURE_RANGE,
    " ", DISTANCE, " au plus ; à défaut, l'ennemie la plus proche, de ", LURE_FAR, " ", DISTANCE, ".",
], Rarity.RARE, onSelf((battle, unit) => {
    const enemies = battle.enemiesOf(unit).filter(enemy => enemy.position.distance(unit.position) <= LURE_RANGE)
    const prey = nearest(enemies.filter(enemy => enemy.feverish), unit.position)
    const caught = prey ?? nearest(enemies, unit.position)
    if(!caught) return
    const toward = unit.position.minus(caught.position).normalized
    if(!toward) return
    const gap = caught.position.distance(unit.position)
    const distance = prey ? Math.max(0, gap - LURE_NEAR - UNIT_RADIUS) : LURE_FAR
    Pushing.shove({ battle, by: unit, target: caught, direction: toward, distance, atOnce: true })
}, "appeau"))

export const MUZZLE = new ActionCard("Muselière", [
    "La première ", UNIT, " touchée sur ", frenchNumber(MUZZLE_LENGTH), " ", DISTANCE, " devant a ses 2 prochains pas immobilisés.",
], Rarity.RARE, onFirstAhead(MUZZLE_LENGTH, MUZZLE_WIDTH, (battle, _unit, target) => {
    battle.applyStatus(target, ROOTED, 2)
}, "muselière"))

export const TREAT = new ActionCard("Friandise", [
    "Soigne de ", new HeartCount(2), " + ", HEAL, " l'allié le plus proche, à ", frenchNumber(TENDING_RANGE), " ", DISTANCE,
    " au plus, et lui donne esquive 1.",
], Rarity.COMMON, onSelf((battle, unit) => {
    const friend = battle.nearestAlly(unit, TENDING_RANGE)
    if(!friend) return
    friend.hearts.heal(2 + unit.stats.heal.value)
    battle.applyStatus(friend, DODGE, 1)
}, "friandise"))

export const STUFFING_PAD = new ActionCard("Rembourrage", [
    "Soigne de ", new HeartCount(3), " + ", HEAL, " l'allié le plus proche, à ", frenchNumber(TENDING_RANGE), " ", DISTANCE,
    " au plus, et lui donne ", new HeartCount(1), " ", SHIELD_HEART, ".",
], Rarity.COMMON, onSelf((battle, unit) => {
    const friend = battle.nearestAlly(unit, TENDING_RANGE)
    if(!friend) return
    friend.hearts.heal(3 + unit.stats.heal.value)
    friend.hearts.give(new Heart(SHIELD_HEART))
}, "rembourrage"))

export const NATURALIZATION = new ActionCard("Naturalisation", [
    "Chaque corps empaillé qui combat pour toi gagne ", new HeartCount(1), " ", SHIELD_HEART, " et soigne ",
    new HeartCount(1), ".",
], Rarity.RARE, onSelf((battle, unit) => {
    for(const body of stuffedBodies(battle, unit)){
        body.hearts.give(new Heart(SHIELD_HEART))
        body.hearts.heal(1)
    }
}, "naturalisation"))

export const TROPHY = new ActionCard("Trophée", [
    "+1 force par corps empaillé qui combat pour toi, jusqu'à la fin du ", BATTLE_ROUND, ".",
], Rarity.EPIC, onSelf((battle, unit) => {
    const count = stuffedBodies(battle, unit).length
    if(count > 0) battle.startProcess(unit, new Strength(count))
}, "trophée"))
