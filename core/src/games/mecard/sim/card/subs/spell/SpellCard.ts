import { concat } from "../../../../../../semantic"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { damage as damageText, meters } from "../../../battle/words"
import type { Action } from "../../../battle/Action"
import type { Element } from "../../../element/Element"
import { ACTION, ELEMENT } from "../../CardType"

import { AbstractCard } from "../AbstractCard"
import { BOLT_WIDTH, fly } from "../tools/bolt"
import { label, polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { ELEMENT_CARDS } from "./ElementCard"
import { UNIT } from "../../../base/keywords"

/** How far the spell of the catalog reaches, in meters. */
const SPELL_RANGE = 4

/** How many hearts the spell of the catalog takes. */
const SPELL_DAMAGE = 1

/** How opaque a bolt of an element shows. */
const BOLT_OPACITY = 0.5

/** A spell: a bolt of the element plugged into it, along the line ahead, up to the first unit. */
export class SpellCard extends AbstractCard<readonly Action[], Element> {


    public readonly output = ACTION
    public readonly input = ELEMENT

    constructor(
        /** How far it reaches, in meters. */
        public readonly range: number,

        /** How many hearts it takes. */
        public readonly damage: number,
    ){
        super("Grand sort", [
            ["Tire l'élément jusqu'à ", meters(range), " devant : ", damageText(damage, "elemental"),
                " à la première ", UNIT, ", puis son négatif sur elle :"],
            ...ELEMENT_CARDS.map(card => concat(card, " : ", card.element.negativeText)),
        ], Rarity.RARE)
    }


    public get(element: Element): readonly Action[] {
        return [SpellCard.#casting(this, element)]
    }


    static #casting(card: SpellCard, element: Element): Action {
        const color = { ...element.color, a: BOLT_OPACITY }
        return {
            use: function* (ctx){
                const { battle, unit } = ctx
                // The bolt stops on the first body it meets.
                const { end } = battle.ray(unit, card.range)
                yield* fly(battle, unit.position, end, color)
                const area = { kind: "segment", from: unit.position, to: end, width: BOLT_WIDTH } as const
                const [hit] = battle.strike(unit, area, card.damage, "elemental")
                if(hit) element.applyNegative(ctx, hit)
            },
            preview: ctx => {
                const { battle, unit, pose } = ctx
                const { end, unit: target } = battle.ray(unit, card.range, pose)
                const path = polygon({ kind: "segment", from: pose.position, to: end, width: BOLT_WIDTH }, color)
                if(!target) return still(pose, path)
                return still(pose, path, label(target.position, element.word, NOTE_COLOR))
            },
        }
    }
}

export const SPELL = new SpellCard(SPELL_RANGE, SPELL_DAMAGE)
