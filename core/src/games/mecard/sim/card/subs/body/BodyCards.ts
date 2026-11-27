import { rgba } from "../../../base/Rgba"
import { EIGHT_WAYS } from "../../../battle/rules"
import type { Area } from "../../../battle/Area"
import { fading, polygonOf } from "../../../battle/effects"
import { HAZARD_COLOR, NOTE_COLOR } from "../../../battle/previewColors"
import type { Pose } from "../../../battle/Action"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { BURN, Burn } from "../../../status/subs/Burn"
import { STUNNED } from "../../../status/subs/Stunned"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { TURN } from "../../../battle/mecanic/turn/keyword"
import { WALK } from "../../../battle/mecanic/walk/keyword"
import * as Turn from "../../../battle/mecanic/turn"
import * as Walk from "../../../battle/mecanic/walk"
import { Rarity } from "../../Rarity"
import { AGILITE, DISTANCE, UNIT } from "../../../base/keywords"
import { DamageType } from "../../../battle/DamageType"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How many hearts a blast takes from each unit in it: a bomb, a kamikaze. */
export const BOMB_DAMAGE = 2

/** How far the blast of a bomb or a kamikaze reaches, in meters. */
export const BLAST_RADIUS = 1.5

/** How far the flash of a flash bomb reaches, in meters. */
export const FLASH_RADIUS = 1.5

/** How many hearts the flames take from a unit still in them. */
export const FLAMES_DAMAGE = 1

/** How many rounds the flames set a unit in them burning for. */
export const FLAMES_BURN = 1

/** How far a wandering step goes, in meters, before the agility of the unit. */
const WANDER_LENGTH = 1

/** The color of the flash. */
const FLASH_COLOR = rgba(1, 0.85, 0.15, 0.55)

/** How long the flash shows, in seconds. */
const FLASH_TIME = 0.4

/** Who a body acts for: its owner, the unit itself when it has none. */
export function sourceOf(unit: Unit): Unit {
    return unit.owner ?? unit
}

/** How far from the edge of its body a unit that blows up, or flashes, reaches: a blast that centers on its middle. */
const KAMIKAZE_RADIUS = BLAST_RADIUS - UNIT_RADIUS
const FLASH_REACH = FLASH_RADIUS - UNIT_RADIUS

/** The ground a body covers: its zone, else its own body. */
export function groundOf(unit: Unit, pose: Pose): Area {
    return unit.zone ?? Areas.circle(pose.position, unit.radius)
}

/** Blow up: every unit around takes the damage, then the unit is gone, a bomb as a goblin. */
export const KAMIKAZE = new ActionCard("Kamikaze", [
    "Explose : ", BOMB_DAMAGE, " ", DamageType.PHYSICAL, " à chaque ", UNIT, " à ", KAMIKAZE_RADIUS, " ",
    DISTANCE, " autour. Puis meurt.",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        battle.explode(unit.around(KAMIKAZE_RADIUS), BOMB_DAMAGE, sourceOf(unit), unit)
        unit.hearts.slay(null)
        hold(battle, SHORT_TIME)
    },
    preview: ({ unit, pose }) => Previews.still(pose, Previews.polygon(unit.around(KAMIKAZE_RADIUS, pose), HAZARD_COLOR), Previews.label(pose.position, "boum", NOTE_COLOR)),
})

/** Flash: every unit around is stunned, then the unit is gone. */
export const FLASH = new ActionCard("Flash", [
    "Chaque ", UNIT, " à ", FLASH_REACH, " ", DISTANCE, " autour gagne ", STUNNED, " ", 1, ". Puis meurt.",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        const flash = unit.around(FLASH_REACH)
        battle.post(fading(FLASH_TIME, [polygonOf(flash, FLASH_COLOR)]))
        for(const target of battle.fetch(flash, unit)) battle.applyStatus(target, STUNNED, 1)
        unit.hearts.slay(null)
        hold(battle, SHORT_TIME)
    },
    preview: ({ unit, pose }) => Previews.still(pose, Previews.polygon(unit.around(FLASH_REACH, pose), FLASH_COLOR), Previews.label(pose.position, "flash", NOTE_COLOR)),
})

/** Blaze: every unit on the ground the unit covers is burnt, then the unit is gone, flames as a torch. */
export const BLAZE = new ActionCard("Embrasement", [
    "Chaque ", UNIT, " sur ta zone : ", FLAMES_DAMAGE, " ", DamageType.ELEMENTAL, " et ", new Burn(FLAMES_BURN),
    ". Puis meurt.",
], Rarity.RARE, {
    use: function ({ battle, unit }){
        for(const target of battle.fetch(groundOf(unit, unit), unit)){
            target.hearts.damage(FLAMES_DAMAGE, DamageType.ELEMENTAL, sourceOf(unit))
            battle.applyStatus(target, BURN, FLAMES_BURN)
        }
        unit.hearts.slay(null)
        hold(battle, SHORT_TIME)
    },
    preview: ({ unit, pose }) => Previews.still(pose, Previews.polygon(groundOf(unit, pose), HAZARD_COLOR), Previews.label(pose.position, "brûle", NOTE_COLOR)),
})

/** A step any way: what wanders, a whirlwind. */
export const RANDOM_STEP = new ActionCard("Pas au hasard", [
    TURN.as("Se tourne"), " au hasard et ", WALK.as("avance"), " de ", WANDER_LENGTH, "×", AGILITE, " ", DISTANCE, ".",
], Rarity.COMMON, {
    use: function (ctx){
        const { battle, unit } = ctx
        Turn.turn(battle, unit, battle.rng.pick(EIGHT_WAYS) ?? unit.direction)
        Walk.travel(ctx, unit.direction, WANDER_LENGTH * unit.stats.move.value, Walk.WALK_SPEED)
    },
    preview: ({ pose }) => Previews.still(pose, Previews.label(pose.position, "au hasard", NOTE_COLOR)),
})

/** The cards the bodies left in the arena play, never found as loot. */
export const BODY_CARDS = [FLASH, BLAZE, RANDOM_STEP] as const
