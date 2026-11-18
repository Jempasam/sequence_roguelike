import { UNIT } from "../../../base/keywords"
import { DamageType } from "../../../battle/DamageType"
import { HAZARD_COLOR, NOTE_COLOR } from "../../../battle/previewColors"
import { SLOWNESS_POTION } from "../../../potion/subs/potions"
import * as Previews from "../../../battle/preview/Previews"

import { ActionCard } from "../ActionCard"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"

import { groundOf, sourceOf } from "./BodyCards"

/** How many hearts a unit that stands in a hole at its turn loses. */
export const FALL_DAMAGE = 1

/** The level of the slowness a puddle of mud pours on each unit in it: one round is spent by the end of the round it comes in. */
export const MUD_LEVEL = 2

/** Fall: every unit on the ground the body covers is hurt, a hole. The body stays. */
export const FALL = new ActionCard("Chute", [
    "Chaque ", UNIT, " sur ta zone : ", FALL_DAMAGE, " ", DamageType.PHYSICAL, ".",
], Rarity.COMMON, {
    use: function({ battle, unit }){
        for(const target of battle.fetch(groundOf(unit, unit), unit)){
            target.hearts.damage(FALL_DAMAGE, DamageType.PHYSICAL, sourceOf(unit))
        }
        hold(battle, SHORT_TIME)
    },
    preview: ({ unit, pose }) => Previews.still(pose, Previews.polygon(groundOf(unit, pose), HAZARD_COLOR), Previews.label(pose.position, "chute", NOTE_COLOR)),
})

/** Hinder: every unit on the ground the body covers is slowed, a puddle of mud, a thicket. The body stays. */
export const HINDER = new ActionCard("Entraver", [
    "Chaque ", UNIT, " sur ta zone : ", SLOWNESS_POTION, " ", MUD_LEVEL, ".",
], Rarity.COMMON, {
    use: function({ battle, unit }){
        for(const target of battle.fetch(groundOf(unit, unit), unit)) SLOWNESS_POTION.apply(battle, target, MUD_LEVEL)
        hold(battle, SHORT_TIME)
    },
    preview: ({ unit, pose }) => Previews.still(pose, Previews.polygon(groundOf(unit, pose), HAZARD_COLOR), Previews.label(pose.position, "entravé", NOTE_COLOR)),
})

/** The cards the bodies of the arena play that no fight lays out for the players, never found as loot. */
export const HAZARD_CARDS = [FALL, HINDER] as const
