import type { Action } from "../../../battle/Action"
import { counted } from "../../../battle/words"
import type { Element } from "../../../element/Element"
import { reaction } from "../../../element/reactions"
import { Echo } from "../../../element/subs/Echo"
import { Ritual } from "../../../process/subs/Ritual"
import { ritualType } from "../../../status/subs/GrandRitual"
import type { Card, RewriteSpot } from "../../Card"
import { ELEMENT } from "../../CardType"
import type { Rewrite } from "../../CardType"
import { Rarity } from "../../Rarity"

import { AbstractCard } from "../AbstractCard"
import { ActionCard } from "../ActionCard"
import { RewriteCard } from "../composite/RewriteCards"
import { hold, SHORT_TIME } from "../tools/playing"
import { polygon, still } from "../tools/previews"
import { UNIT_RADIUS } from "../../../battle/Unit"
import { compoundCard, ElementCard } from "./ElementCard"
import { conjured } from "./ElementActions"

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
        use: function* (ctx){
            const { position, direction } = conjured(ctx.battle, ctx.unit)
            invoked.invoke(ctx, position, direction, applied)
            yield* hold(ctx.battle, SHORT_TIME)
        },
        preview: ({ battle, pose }) => {
            const center = conjured(battle, pose).position
            const color = { ...applied.color, a: SPOT_OPACITY }
            return still(pose, polygon({ kind: "circle", center, radius: UNIT_RADIUS }, color))
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
    "Fin de préparation : les deux éléments à sa droite réagissent et deviennent un seul : Feu et Eau font de la Vapeur, ",
    "Feu et Pierre de la Lave, Vent et Électricité une Tempête, Eau et Pierre de la Boue, Feu et Vent un Brasier, ",
    "Plante et Pierre des Ronces. Sans réaction, l'un des deux au hasard l'emporte.",
], Rarity.RARE, (ctx, spot) => {
    const elements = nextTwo(spot)
    if(!elements) return NOTHING
    const product = reaction(...elements)
    const card = product ? compoundCard(product) : ctx.pick([spot.rest[0], spot.rest[1]] as Card[])
    return { cards: [card], consumed: 2, acting: false }
})

/** What a ritual gives: the element on its right leaves the chain, kept by what it does to the battle. */
function keeping(_ctx: unknown, spot: RewriteSpot): Rewrite {
    return elementOf(spot.next) ? { cards: [], consumed: 1, acting: true } : NOTHING
}

/** The element on its right kept for the round. */
export const RITUAL = new RewriteCard("Rituel", [
    "Fin de préparation : garde l'élément à sa droite jusqu'à la fin du round. Un Écho s'y mêle.",
], Rarity.RARE, keeping, ({ battle, unit, spot }) => {
    const element = elementOf(spot.next)
    if(element) battle.startProcess(unit, new Ritual(element))
})

/** The element on its right kept for rounds. */
export const GRAND_RITUAL_CARD = new RewriteCard("Grand rituel", [
    "Fin de préparation : garde l'élément à sa droite pendant ", counted(GRAND_RITUAL_ROUNDS, "round"), ". Un Écho s'y mêle.",
], Rarity.EPIC, keeping, ({ battle, unit, spot }) => {
    const element = elementOf(spot.next)
    if(element) battle.applyStatus(unit, ritualType(element), GRAND_RITUAL_ROUNDS)
})

/** An element meeting the ritual going on, when it plays: what they give as they react. */
export class EchoCard extends AbstractCard<Element, Element> {


    public readonly output = ELEMENT
    public readonly input = ELEMENT

    constructor(){
        super("Écho", [
            "Mêle l'élément à sa droite à celui de ton rituel en cours : ils réagissent quand il joue. Sans rituel ni réaction, ",
            "il reste lui-même.",
        ], Rarity.RARE)
    }


    public get(element: Element): Element {
        return new Echo(element)
    }
}

export const ECHO = new EchoCard()
