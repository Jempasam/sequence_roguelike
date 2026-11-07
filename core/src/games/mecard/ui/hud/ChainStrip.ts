import type { Painter, Sprite } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Box, Component, EMPTY_HINT, Label, Stack } from "../../../../engine/ui"
import type { SizeHint, Theme } from "../../../../engine/ui"
import { typeColorOf } from "../look/colors"
import type { CardType } from "../../sim/card/CardType"
import type { Card } from "../../sim/card/Card"
import type { CardNode } from "../../sim/card/CardNode"
import type { ChainView } from "../../sim/card/CardChain"

import { CardView } from "./CardView"
import type { CardPlace } from "./CardView"

/** The space under the cards, in virtual pixels, where the links between them are drawn. */
export const LINK_ROOM = 6

/** How far below the cards a link runs, in virtual pixels. */
const LINK_DROP = 3

/** The color of a link carrying a type. */
function linkOf(type: CardType<unknown>): Color {
    return typeColorOf(type)
}

/**
 * A card of a chain as a strip shows it: the card, and what is plugged into each of its slots, none for an
 * empty one.
 */
export interface StripCard {
    readonly card: Card
    readonly inputs: readonly (StripCard|null)[]

    /** Does it play, rather than being greyed out? */
    readonly active: boolean

    /** Is it being looked at? */
    readonly lit: boolean

    /** Is it crossed out, since it could not be built? */
    readonly crossed: boolean

    /** The color of the link to each slot. */
    readonly links: readonly Color[]
}

/** What a strip marks on a chain being read. */
export interface StripMarks {
    /** The next card to read: those before it are greyed out. */
    readonly cursor: number

    /** The cards being looked at, none when none are. */
    readonly lit: {
        readonly first: number
        readonly last: number

        /** Could they not be built? */
        readonly invalid: boolean
    }|null
}

/** Nothing to mark. */
const NO_MARKS: StripMarks = { cursor: 0, lit: null }

/**
 * A chain a team sees whole, as a strip shows it. Each card of the strip is noted with its node, so a click
 * on it finds the node back.
 */
export function stripOf(node: CardNode, nodes: Map<StripCard, CardNode>): StripCard {
    const strip: StripCard = {
        card: node.card,
        inputs: node.inputs.map(input => input ? stripOf(input, nodes) : null),
        active: node.active,
        lit: false,
        crossed: false,
        links: node.card.input ? [linkOf(node.card.input)] : [],
    }
    nodes.set(strip, node)
    return strip
}

/** A chain as a viewer sees it, as a strip shows it. Only the cards it read already are greyed out. */
export function stripOfView(view: ChainView, marks: StripMarks = NO_MARKS): StripCard {
    const type = view.card.input
    const { cursor, lit } = marks
    const looked = lit !== null && view.index >= lit.first && view.index <= lit.last
    return {
        card: view.card,
        inputs: view.inputs.map(input => input ? stripOfView(input, marks) : null),
        active: view.index >= cursor,
        lit: looked,
        crossed: looked && lit.invalid,
        links: type ? view.inputs.map(() => linkOf(type)) : [],
    }
}

/** What a strip does when its cards are clicked or hovered. */
export interface ChainStripHost {
    /** A card was clicked. */
    pick(card: StripCard): void

    /** The pointer came over the cards of a root, or left them. */
    hoverRoot(index: number, over: boolean): void

    /** The deck a card comes from, none for a card from elsewhere. */
    deckOf(card: Card): number|null

    /** What crosses out a card, none before it is loaded, or where no card is. */
    readonly cross?: Sprite|null
}

/** A link to draw, from a card to what is plugged into one of its slots. */
interface Link {
    readonly from: Component
    readonly to: Component
    readonly color: Color
}

/**
 * A chain laid out as the hand is: its roots from left to right, each root followed by what is plugged into
 * it, in depth, and a link drawn under each card to what it takes. The same strip shows the chain being put
 * together, above the hand, and the chains of every unit, smaller, on the right.
 *
 * @remarks
 * The links are drawn by a component under the row of cards, in the same stack: it reads the bounds the row
 * gave its cards, so a link follows its cards wherever the row lays them.
 */
export class ChainStrip extends Stack {


    constructor(
        public readonly theme: Theme,
        roots: readonly StripCard[],

        /** Where its cards are shown, which sets their size. */
        public readonly cardPlace: CardPlace,

        host: ChainStripHost,
    ){
        super()
        const row = new Box("row", { gap: cardPlace === "mini" ? 1 : 2, align: "start" })
        // Set first: the cards are added to it while the roots are laid out.
        this.#row = row
        const links: Link[] = []
        roots.forEach((root, index) => {
            if(index > 0) row.add(new Label(theme, ">"), { align: "center" })
            const hover = (over: boolean) => host.hoverRoot(index, over)
            const add = (strip: StripCard): Component => {
                const card = new CardView(theme, strip.card, cardPlace)
                card.dimmed = !strip.active
                card.lit = strip.lit
                card.cross = strip.crossed ? host.cross ?? null : null
                card.deck = strip.card ? host.deckOf(strip.card) : null
                card.onPick = () => host.pick(strip)
                card.onHover = hover
                row.add(card)
                strip.inputs.forEach((input, slot) => {
                    if(input) links.push({ from: card, to: add(input), color: strip.links[slot] })
                })
                return card
            }
            add(root)
        })
        this.add(new Links(theme, row, links), { x: "stretch", y: "stretch" })
        this.add(row, { x: "start", y: "start" })
    }


    protected override computeHint(maxWidth: number): SizeHint {
        const hint = this.#row.measure(maxWidth)
        return {
            minWidth: hint.minWidth, minHeight: hint.minHeight + LINK_ROOM,
            preferredWidth: hint.preferredWidth, preferredHeight: hint.preferredHeight + LINK_ROOM,
        }
    }


    readonly #row: Box
}

/** A card of a flat strip: whether it plays, rather than being greyed out. */
export interface FlatCard {
    readonly card: Card
    readonly active: boolean
}

/** Cards of a flat strip that serve together, as places in the strip, and the type of what they give. */
export interface FlatGroup {
    readonly places: readonly number[]
    readonly type: CardType<unknown>
}

/** What a flat strip does when its cards are clicked or hovered. */
export interface FlatStripHost {
    /** The card at a place was clicked. */
    pick(place: number): void

    /** The pointer came over the card at a place, or left it. */
    hover(place: number, over: boolean): void

    /** The deck a card comes from, none for a card from elsewhere. */
    deckOf(card: Card): number|null
}

/**
 * A chain laid out flat, in the order of its row, with a link under the cards that serve together: the
 * chain being put together, whose cards read as they are rewritten, not as they stand.
 */
export class FlatStrip extends Stack {


    constructor(
        public readonly theme: Theme,
        cards: readonly FlatCard[],
        groups: readonly FlatGroup[],
        host: FlatStripHost,
    ){
        super()
        const row = new Box("row", { gap: 2, align: "start" })
        this.#row = row
        const views = cards.map(({ card, active }, place) => {
            const view = new CardView(theme, card, "chain")
            view.dimmed = !active
            view.deck = host.deckOf(card)
            view.onPick = () => host.pick(place)
            view.onHover = over => host.hover(place, over)
            row.add(view)
            return view
        })
        const links: Link[] = groups.flatMap(({ places, type }) => places.slice(1).map((place, index) => ({
            from: views[places[index]], to: views[place], color: linkOf(type),
        })))
        this.add(new Links(theme, row, links), { x: "stretch", y: "stretch" })
        this.add(row, { x: "start", y: "start" })
    }


    protected override computeHint(maxWidth: number): SizeHint {
        const hint = this.#row.measure(maxWidth)
        return {
            minWidth: hint.minWidth, minHeight: hint.minHeight + LINK_ROOM,
            preferredWidth: hint.preferredWidth, preferredHeight: hint.preferredHeight + LINK_ROOM,
        }
    }


    readonly #row: Box
}

/** The links of a strip, drawn under its cards: down from the middle of a card, across, up to the other. */
class Links extends Component {


    constructor(
        public readonly theme: Theme,
        public readonly row: Box,
        public readonly links: readonly Link[],
    ){
        super()
    }


    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    protected paint(painter: Painter): void {
        painter.push()
        painter.setWhitePixel(this.theme.white)
        // The cards lie in the row, the row in the strip at the same origin as this component.
        const offsetX = this.row.bounds.x - this.bounds.x
        const offsetY = this.row.bounds.y - this.bounds.y
        for(const { from, to, color } of this.links){
            const fromX = Math.round(offsetX + from.bounds.x + from.bounds.width / 2)
            const toX = Math.round(offsetX + to.bounds.x + to.bounds.width / 2)
            const fromBottom = offsetY + from.bounds.y + from.bounds.height
            const toBottom = offsetY + to.bounds.y + to.bounds.height
            const under = Math.max(fromBottom, toBottom) + LINK_DROP
            painter.setTint(color)
            painter.rect(fromX - 1, fromBottom, 2, under - fromBottom + 2)
            painter.rect(toX - 1, toBottom, 2, under - toBottom + 2)
            painter.rect(Math.min(fromX, toX) - 1, under, Math.abs(toX - fromX) + 2, 2)
        }
        painter.pop()
    }
}
