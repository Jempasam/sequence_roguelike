import { rgba } from "../../../base/Rgba"
import { EIGHT_WAYS } from "../../../battle/rules"
import type { Area } from "../../../battle/Area"
import { fading, polygonOf } from "../../../battle/effects"
import { HAZARD_COLOR, NOTE_COLOR } from "../../../battle/previewColors"
import type { Pose } from "../../../battle/Action"
import type { Unit } from "../../../battle/Unit"
import { frenchNumber } from "../../../battle/words"
import { BURN, Burn } from "../../../status/subs/Burn"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME, travel, WALK_SPEED } from "../tools/playing"
import { label, polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { AGILITE, DISTANCE, UNIT } from "../../../base/keywords"
import { DamageType } from "../../../battle/DamageType"

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
const FLASH_COLOR = rgba(1, 1, 0.85, 0.7)

/** How long the flash shows, in seconds. */
const FLASH_TIME = 0.4

/** Who a body acts for: its owner, the unit itself when it has none. */
function sourceOf(unit: Unit): Unit {
    return unit.owner ?? unit
}

/** The ground around a pose, as far as a radius reaches. */
function around(pose: Pose, radius: number): Area {
    return { kind: "circle", center: pose.position, radius }
}

/** The ground a body covers: its zone, else its own body. */
function groundOf(unit: Unit, pose: Pose): Area {
    return unit.zone ?? { kind: "circle", center: pose.position, radius: unit.radius }
}

/** Blow up: every unit around takes the damage, then the unit is gone, a bomb as a goblin. */
export const KAMIKAZE = new ActionCard("Kamikaze", [
    "Explose : ", BOMB_DAMAGE, " ", DamageType.PHYSICAL, " à chaque ", UNIT, " à ", frenchNumber(BLAST_RADIUS), " ",
    DISTANCE, " autour. Puis meurt.",
], Rarity.RARE, {
    use: function* ({ battle, unit }){
        battle.explode(around(unit, BLAST_RADIUS), BOMB_DAMAGE, sourceOf(unit), unit)
        unit.hearts.slay(null)
        yield* hold(battle, SHORT_TIME)
    },
    preview: ({ pose }) => still(pose, polygon(around(pose, BLAST_RADIUS), HAZARD_COLOR), label(pose.position, "boum", NOTE_COLOR)),
})

/** Flash: every unit around is stunned, then the unit is gone. */
export const FLASH = new ActionCard("Flash", [
    "Étourdit chaque ", UNIT, " à ", frenchNumber(FLASH_RADIUS), " ", DISTANCE, " autour. Puis meurt.",
], Rarity.RARE, {
    use: function* ({ battle, unit }){
        const flash = around(unit, FLASH_RADIUS)
        battle.post(fading(FLASH_TIME, [polygonOf(flash, FLASH_COLOR)]))
        for(const target of battle.unitsIn(flash, unit)) battle.stun(target)
        unit.hearts.slay(null)
        yield* hold(battle, SHORT_TIME)
    },
    preview: ({ pose }) => still(pose, polygon(around(pose, FLASH_RADIUS), FLASH_COLOR), label(pose.position, "flash", NOTE_COLOR)),
})

/** Blaze: every unit on the ground the unit covers is burnt, then the unit is gone, flames as a torch. */
export const BLAZE = new ActionCard("Embrasement", [
    "Chaque ", UNIT, " sur ta zone : ", FLAMES_DAMAGE, " ", DamageType.ELEMENTAL, " et ", new Burn(FLAMES_BURN),
    ". Puis meurt.",
], Rarity.RARE, {
    use: function* ({ battle, unit }){
        for(const target of battle.unitsIn(groundOf(unit, unit), unit)){
            target.hearts.damage(FLAMES_DAMAGE, DamageType.ELEMENTAL, sourceOf(unit))
            battle.applyStatus(target, BURN, FLAMES_BURN)
        }
        unit.hearts.slay(null)
        yield* hold(battle, SHORT_TIME)
    },
    preview: ({ unit, pose }) => still(pose, polygon(groundOf(unit, pose), HAZARD_COLOR), label(pose.position, "brûle", NOTE_COLOR)),
})

/** A step any way: what wanders, a whirlwind. */
export const RANDOM_STEP = new ActionCard("Pas au hasard", [
    "Se tourne au hasard et avance de ", WANDER_LENGTH, "×", AGILITE, " ", DISTANCE, ".",
], Rarity.COMMON, {
    use: function* (ctx){
        const { battle, unit } = ctx
        battle.turn(unit, battle.rng.pick(EIGHT_WAYS) ?? unit.direction)
        yield* travel(ctx, unit.direction, WANDER_LENGTH * unit.stats.move.value, WALK_SPEED)
    },
    preview: ({ pose }) => still(pose, label(pose.position, "au hasard", NOTE_COLOR)),
})

/** The cards the bodies left in the arena play, never found as loot. */
export const BODY_CARDS = [KAMIKAZE, FLASH, BLAZE, RANDOM_STEP] as const
