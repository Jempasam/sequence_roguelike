import type { Text } from "../../../../../../semantic"
import { NOTE_COLOR } from "../../../battle/previewColors"
import { UNIT_RADIUS } from "../../../battle/Unit"
import { frenchNumber } from "../../../battle/words"
import type { Action, Pose } from "../../../battle/Action"
import type { Battle } from "../../../battle/Battle"
import type { Element } from "../../../element/Element"
import { ACTION, ELEMENT } from "../../CardType"

import { AbstractCard } from "../AbstractCard"
import { BOLT_WIDTH, fly } from "../tools/bolt"
import { hold, SHORT_TIME } from "../tools/playing"
import { label, polygon, still } from "../tools/previews"
import { Rarity } from "../../Rarity"
import { DISTANCE, PORTEE, UNIT } from "../../../base/keywords"

/** How far the small spell of the catalog reaches, in meters, before the reach of the unit. */
const SMALL_SPELL_RANGE = 6

/** How far ahead the conjuration of the catalog calls its element, in meters. */
const CONJURATION_AHEAD = 1.5

/** How opaque a bolt of an element shows. */
const BOLT_OPACITY = 0.5

/** How opaque the spot of a conjuration shows. */
const SPOT_OPACITY = 0.3

/** An action made from the element plugged into it. */
export class ElementActionCard extends AbstractCard<readonly Action[], Element> {


    public readonly output = ACTION
    public readonly input = ELEMENT

    constructor(
        name: string, description: Text, rarity: Rarity,

        /** What it plays, cast with an element. */
        public readonly cast: (element: Element) => Action,
    ){
        super(name, description, rarity)
    }


    public get(element: Element): readonly Action[] {
        return [this.cast(element)]
    }
}

/** Where a conjuration calls its element from a pose: within the walls. */
export function conjured(battle: Battle, pose: Pose): Pose {
    const ahead = pose.position.plus(pose.direction.times(CONJURATION_AHEAD))
    return { position: battle.arena.clamped(ahead, UNIT_RADIUS), direction: pose.direction }
}

/** The positive of the element on the unit itself. */
export const AURA = new ElementActionCard("Aura", "S'applique le positif de l'élément.", Rarity.COMMON, element => ({
    use: function* (ctx){
        element.applyPositive(ctx, ctx.unit)
        yield* hold(ctx.battle, SHORT_TIME, [label(ctx.unit.position, element.name, NOTE_COLOR)])
    },
    preview: ({ pose }) => still(pose, label(pose.position, element.name, NOTE_COLOR)),
}))

/** The negative of the element on the first body far ahead, without a wound. */
export const SMALL_SPELL = new ElementActionCard("Petit sort", [
    "Tire l'élément jusqu'à ", SMALL_SPELL_RANGE, "×", PORTEE, " ", DISTANCE, " devant : son négatif à la première ", UNIT, ".",
], Rarity.COMMON, element => {
    const color = { ...element.color, a: BOLT_OPACITY }
    return {
        use: function* (ctx){
            const { battle, unit } = ctx
            const { end, unit: hit } = battle.ray(unit, SMALL_SPELL_RANGE * unit.stats.throwRange.value)
            yield* fly(battle, unit.position, end, color)
            if(hit) element.applyNegative(ctx, hit)
        },
        preview: ({ battle, unit, pose }) => {
            const range = SMALL_SPELL_RANGE * unit.stats.throwRange.value
            const { end, unit: target } = battle.ray(unit, range, pose)
            const path = polygon({ kind: "segment", from: pose.position, to: end, width: BOLT_WIDTH }, color)
            if(!target) return still(pose, path)
            return still(pose, path, label(target.position, element.word, NOTE_COLOR))
        },
    }
})

/** What the element calls, a little ahead. */
export const CONJURATION = new ElementActionCard("Conjuration", [
    "Invoque l'élément à ", frenchNumber(CONJURATION_AHEAD), " ", DISTANCE, " devant.",
], Rarity.RARE, element => ({
    use: function* (ctx){
        const { position, direction } = conjured(ctx.battle, ctx.unit)
        element.invoke(ctx, position, direction, element)
        yield* hold(ctx.battle, SHORT_TIME)
    },
    preview: ({ battle, pose }) => {
        const center = conjured(battle, pose).position
        const color = { ...element.color, a: SPOT_OPACITY }
        return still(pose, polygon({ kind: "circle", center, radius: UNIT_RADIUS }, color))
    },
}))
