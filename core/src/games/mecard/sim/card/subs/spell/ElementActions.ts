import type { Text } from "../../../../../../semantic"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Unit } from "../../../battle/Unit"
import { frenchNumber } from "../../../battle/words"
import type { Action, Pose } from "../../../battle/Action"
import type { Area } from "../../../battle/Area"
import type { Battle } from "../../../battle/Battle"
import type { Element } from "../../../element/Element"
import { ACTION, ELEMENT } from "../../CardType"
import { enchantmentOf } from "../../../status/subs/EnchantedBlade"

import { AbstractCard } from "../AbstractCard"
import { BOLT_WIDTH, spellLook } from "../tools/bolt"
import { hold, SHORT_TIME } from "../tools/playing"
import { Rarity } from "../../Rarity"
import { DISTANCE, PORTEE, UNIT, BATTLE_ROUND } from "../../../base/keywords"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"
import { DamageType } from "../../../battle/DamageType"

/** How far the small spell of the catalog reaches, in meters, before the reach of the unit. */
const SMALL_SPELL_RANGE = 6 - UNIT_RADIUS

/** How far ahead of the edge of the unit the conjuration of the catalog calls its element, in meters. */
const CONJURATION_AHEAD = 1.5 - UNIT_RADIUS

/** How opaque the spot of a conjuration shows. */
const SPOT_OPACITY = 0.3

/** An action made from the element plugged into it. */
export class ElementActionCard extends AbstractCard<Action, Element> {


    public readonly output = ACTION
    public readonly input = ELEMENT

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** What it plays, cast with an element. */
        public readonly cast: (element: Element) => Action,
    ){
        super(name, description, rarity)
    }


    public get(element: Element): Action {
        return this.cast(element)
    }
}

/** Where a conjuration calls its element from a pose: within the walls. */
export function conjured(battle: Battle, unit: Unit, pose: Pose = unit): Pose {
    const ahead = unit.muzzle(pose).plus(pose.direction.times(CONJURATION_AHEAD))
    return { position: battle.arena.clamped(ahead, UNIT_RADIUS), direction: pose.direction }
}

/** The positive of the element on the unit itself. */
export const AURA = new ElementActionCard("Aura", "S'applique le positif de l'élément.", Rarity.COMMON, element => ({
    use: function (ctx){
        element.applyPositive(ctx, ctx.unit)
        hold(ctx.battle, SHORT_TIME, [Previews.label(ctx.unit.position, element.name, NOTE_COLOR)])
    },
    preview: ({ pose }) => Previews.still(pose, Previews.label(pose.position, element.name, NOTE_COLOR)),
}))

/** The element on the blade of the unit for the round: each blow that lands applies its negative. */
export const ELEMENT_ON_BLADE = new ElementActionCard("Élément sur lame", [
    "Jusqu'à la fin du ", BATTLE_ROUND, ", chacune de tes attaques qui touche applique le négatif de l'élément.",
], Rarity.RARE, element => ({
    use: function (ctx){
        ctx.battle.applyStatus(ctx.unit, enchantmentOf(element), 1)
        hold(ctx.battle, SHORT_TIME, [Previews.label(ctx.unit.position, element.name, NOTE_COLOR)])
    },
    preview: ({ pose }) => Previews.still(pose, Previews.label(pose.position, `lame : ${element.name}`, NOTE_COLOR)),
}))

/** The negative of the element on the first body far ahead, without a wound. */
export const SMALL_SPELL = new ElementActionCard("Petit sort", [
    "Tire l'élément jusqu'à ", SMALL_SPELL_RANGE, "×", PORTEE, " ", DISTANCE, " devant : son négatif à la première ", UNIT, ".",
], Rarity.COMMON, element => ({
    use: function (ctx){
        const { battle, unit } = ctx
        const { start, end, unit: hit } = battle.ray(unit, SMALL_SPELL_RANGE * unit.stats.throwRange.value)
        battle.showBlow(unit, Areas.line(start, end, BOLT_WIDTH), DamageType.ELEMENTAL, spellLook(element))
        if(hit) element.applyNegative(ctx, hit)
    },
    preview: ({ battle, unit, pose }) => {
        const range = SMALL_SPELL_RANGE * unit.stats.throwRange.value
        const { start, end, unit: target } = battle.ray(unit, range, pose)
        const path: Area = Areas.line(start, end, BOLT_WIDTH)
        const reached = Previews.strike([path], target ? [target] : [])
        if(!target) return Previews.still(pose, ...reached)
        return Previews.still(pose, ...reached, Previews.label(target.position, element.word, NOTE_COLOR))
    },
}))

/** What the element calls, a little ahead. */
export const CONJURATION = new ElementActionCard("Conjuration", [
    "Invoque l'élément à ", frenchNumber(CONJURATION_AHEAD), " ", DISTANCE, " devant.",
], Rarity.RARE, element => ({
    use: function (ctx){
        const { position, direction } = conjured(ctx.battle, ctx.unit)
        element.invoke(ctx, position, direction, element)
        hold(ctx.battle, SHORT_TIME)
    },
    preview: ({ battle, unit, pose }) => {
        const center = conjured(battle, unit, pose).position
        const color = { ...element.color, a: SPOT_OPACITY }
        return Previews.still(pose, Previews.polygon(Areas.circle(center, UNIT_RADIUS), color))
    },
}))
