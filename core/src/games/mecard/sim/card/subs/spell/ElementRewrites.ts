import type { Action } from "../../../battle/Action"
import { counted } from "../../../battle/words"
import type { Element } from "../../../element/Element"
import { COMPOUNDS, reaction } from "../../../element/reactions"
import { ritualType } from "../../../status/subs/RitualStatus"
import type { Card, RewriteSpot } from "../../Card"
import { ELEMENT } from "../../CardType"
import type { Rewrite } from "../../CardType"
import { Rarity } from "../../Rarity"

import { ActionCard } from "../ActionCard"
import { InputRewriteCard, RECOVERY, REPETITION, RewriteCard } from "../composite/RewriteCards"
import { hold, SHORT_TIME } from "../tools/playing"
import { UNIT_RADIUS } from "../../../battle/Unit"
import { compoundCard, ElementCard } from "./ElementCard"
import { conjured } from "./ElementActions"
import { FusionCard } from "../composite/FusionCard"
import * as Areas from "../../../battle/area/Areas"
import * as Previews from "../../../battle/preview/Previews"

/** How many rounds the ritual of the catalog keeps its element. */
const RITUAL_ROUNDS = 1

/** How many rounds the grand ritual of the catalog keeps its element. */
const GRAND_RITUAL_ROUNDS = 3

/** How opaque the spot of a crossed spell shows. */
const SPOT_OPACITY = 0.3

/** What a rewrite finding nothing it can use gives: nothing, the cards on its right left as they are. */
const NOTHING: Rewrite = { cards: [], consumed: 0, acting: false }

/** The element of a card, none for a card giving none as it stands. */
function elementOf(card: Card|null|undefined): Element|null {
    return card instanceof ElementCard ? card.element : null
}

/** The elements of the two cards on the right of a spot, none unless both give one. */
function nextTwo({ rest }: RewriteSpot): readonly [Element, Element]|null {
    const first = elementOf(rest[0])
    const second = elementOf(rest[1])
    return first && second ? [first, second] : null
}

/** What calls an element, its negative that of another. */
function crossing(invoked: Element, applied: Element): Action {
    return {
        use: function (ctx){
            const { position, direction } = conjured(ctx.battle, ctx.unit)
            invoked.invoke(ctx, position, direction, applied)
            hold(ctx.battle, SHORT_TIME)
        },
        preview: ({ battle, pose }) => {
            const center = conjured(battle, pose).position
            const color = { ...applied.color, a: SPOT_OPACITY }
            return Previews.still(pose, Previews.polygon(Areas.circle(center, UNIT_RADIUS), color))
        },
    }
}

/** What the two elements on its right call, the first's way, the second's negative. */
export const CROSSED_SPELL = new RewriteCard("Sort croisé", [
    "Fin de préparation : prend les deux éléments à sa droite. Invoque le premier, mais c'est le négatif du second ",
    "qu'il applique.",
], Rarity.RARE, (_ctx, spot) => {
    const elements = nextTwo(spot)
    if(!elements) return NOTHING
    const [invoked, applied] = elements
    const card = new ActionCard("Sort croisé", [invoked, " qui applique ", applied], Rarity.RARE, crossing(invoked, applied))
    return { cards: [card], consumed: 2, acting: false }
})

/** What the two elements on its right give as they react. */
export const REACTION = new RewriteCard("Réaction", [
    "Fin de préparation : les deux éléments à sa droite réagissent et deviennent un seul : ",
    COMPOUNDS.map(({ first, second, name }) => `${first.name} + ${second.name} = ${name}`).join(", "),
    ". Sans réaction, l'un des deux au hasard l'emporte.",
], Rarity.RARE, (ctx, spot) => {
    const elements = nextTwo(spot)
    if(!elements) return NOTHING
    const product = reaction(...elements)
    const card = product ? compoundCard(product) : ctx.pick([spot.rest[0], spot.rest[1]] as Card[])
    return { cards: [card], consumed: 2, acting: false }
})

/** What a ritual gives: nothing in its place, what it took kept by what it does to the battle. */
const KEPT: Rewrite = { cards: [], consumed: 0, acting: true }

/** The element it takes, kept for the round. */
export const RITUAL = new InputRewriteCard("Rituel", [
    "Fin de préparation : garde son élément pendant ", counted(RITUAL_ROUNDS, "round"), ". Une fois la préparation finie, ",
    "les éléments de ta chaîne qui réagissent avec lui deviennent leur composé.",
], Rarity.RARE, ELEMENT, () => KEPT, ({ battle, unit }, element) => {
    battle.applyStatus(unit, ritualType(element), RITUAL_ROUNDS)
})

/** The element it takes, kept for rounds. */
export const GRAND_RITUAL_CARD = new InputRewriteCard("Grand rituel", [
    "Fin de préparation : garde son élément pendant ", counted(GRAND_RITUAL_ROUNDS, "round"), ". Une fois la préparation ",
    "finie, les éléments de ta chaîne qui réagissent avec lui deviennent leur composé.",
], Rarity.EPIC, ELEMENT, () => KEPT, ({ battle, unit }, element) => {
    battle.applyStatus(unit, ritualType(element), GRAND_RITUAL_ROUNDS)
})

export const ECHO_RITUAL = new FusionCard([RITUAL, RECOVERY],{name: "Rituel de l'Echo", rarity: Rarity.EPIC})