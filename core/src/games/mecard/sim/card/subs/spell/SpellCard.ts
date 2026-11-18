import { NOTE_COLOR } from "../../../battle/previewColors"
import type { Action } from "../../../battle/Action"
import { UNIT_RADIUS } from "../../../battle/Unit"
import type { Element } from "../../../element/Element"
import { ACTION, ELEMENT } from "../../CardType"

import { AbstractCard } from "../AbstractCard"
import { BOLT_WIDTH, fly } from "../tools/bolt"
import { Rarity } from "../../Rarity"
import { DISTANCE, UNIT } from "../../../base/keywords"
import { DamageType } from "../../../battle/DamageType"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How far the spell of the catalog reaches from the edge of the unit, in meters. */
const SPELL_RANGE = 4 - UNIT_RADIUS

/** How many hearts the spell of the catalog takes. */
const SPELL_DAMAGE = 1

/** How opaque a bolt of an element shows. */
const BOLT_OPACITY = 0.5

/** A spell: a bolt of the element plugged into it, along the line ahead, up to the first unit. */
export class SpellCard extends AbstractCard<Action, Element> {


    public readonly output = ACTION
    public readonly input = ELEMENT

    constructor(
        /** How far it reaches, in meters. */
        public readonly range: number,

        /** How many hearts it takes. */
        public readonly damage: number,
    ){
        super("Grand sort", [
            "Tire l'élément jusqu'à ", range, " ", DISTANCE, " devant : ", damage, " ", DamageType.ELEMENTAL,
            " à la première ", UNIT, ", puis son négatif sur elle.",
        ], Rarity.RARE)
    }


    public get(element: Element): Action {
        return SpellCard.#casting(this, element)
    }


    static #casting(card: SpellCard, element: Element): Action {
        const color = { ...element.color, a: BOLT_OPACITY }
        return {
            use: function (ctx){
                const { battle, unit } = ctx
                // The bolt stops on the first body it meets.
                const { start, end } = battle.ray(unit, card.range)
                fly(battle, start, end, color)
                const area = Areas.line(start, end, BOLT_WIDTH)
                const [hit] = battle.strike(unit, area, card.damage, DamageType.ELEMENTAL)
                if(hit) element.applyNegative(ctx, hit)
            },
            preview: ctx => {
                const { battle, unit, pose } = ctx
                const { start, end, unit: target } = battle.ray(unit, card.range, pose)
                const path = Previews.polygon(Areas.line(start, end, BOLT_WIDTH), color)
                if(!target) return Previews.still(pose, path)
                return Previews.still(pose, path, Previews.label(target.position, element.word, NOTE_COLOR))
            },
        }
    }
}

export const SPELL = new SpellCard(SPELL_RANGE, SPELL_DAMAGE)
