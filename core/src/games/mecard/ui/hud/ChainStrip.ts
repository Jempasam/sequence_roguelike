import type { Painter, Sprite } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Box, Component, EMPTY_HINT, Label, Stack } from "../../../../engine/ui"
import type { SizeHint, Theme } from "../../../../engine/ui"
import { ELEMENT, MODULE, POTION } from "../../sim/card/CardType"
import type { CardType } from "../../sim/card/CardType"
import type { Card } from "../../sim/card/Card"
import type { CardNode } from "../../sim/card/CardNode"
import type { ChainView } from "../../sim/card/CardChain"

import { CardView } from "./CardView"
import type { CardPlace } from "./CardView"
import { SlotView } from "./SlotView"

/** The space under the cards, in virtual pixels, where the links between them are drawn. */
export const LINK_ROOM = 6

/** How far below the cards a link runs, in virtual pixels. */
const LINK_DROP = 3

/** The color of a link carrying actions. */
const ACTION_LINK = new Color(0.35, 0.6, 1)

/** The color of a link carrying an element. */
const ELEMENT_LINK = new Color(0.4, 0.85, 0.45)

/** The color of a link carrying a potion. */
const POTION_LINK = new Color(0.6, 0.9, 0.2)

/** The color of a link carrying a module. */
const MODULE_LINK = new Color(0.6, 0.7, 0.75)

/** The color of a link the viewer cannot know the type of, under a hidden card. */
const HIDDEN_LINK = new Color(0.4, 0.38, 0.48)

/** The color of a link carrying a type. */
function linkOf(type: CardType<unknown>): Color {
    if(type === MODULE) return MODULE_LINK
    return type === ELEMENT ? ELEMENT_LINK : type === POTION ? POTION_LINK : ACTION_LINK
}

/**
 * A card of a chain as a strip shows it: the card, none when the viewer may not see it, and what is plugged
 * into each of its slots, none for an empty one.
 */
export interface StripCard {
    readonly card: Card|null
    readonly inputs: readonly (StripCard|null)[]

    /** Does it play, rather than being greyed out? */
    readonly active: boolean

    /** Is it being looked at? */
    readonly lit: boolean

    /** Is it crossed out, since it could not be built? */
    readonly crossed: boolean

    /** The name of what each slot takes, a "?" when the card is hidden. */
    readonly takes: readonly string[]

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
        takes: node.card.input ? [node.card.input.name] : [],
        links: node.card.input ? [linkOf(node.card.input)] : [],
    }
    nodes.set(strip, node)
    return strip
}

/**
 * A chain as another team sees it, its nested cards maybe hidden, as a strip shows it. Only the cards it
 * read already are greyed out: what a hidden card does to the others is not told.
 */
export function stripOfView(view: ChainView, marks: StripMarks = NO_MARKS): StripCard {
    const type = view.card?.input
    const { cursor, lit } = marks
    const looked = lit !== null && view.index >= lit.first && view.index <= lit.last
    return {
        card: view.card,
        inputs: view.inputs.map(input => input ? stripOfView(input, marks) : null),
        active: view.index >= cursor,
        lit: looked,
        crossed: looked && lit.invalid,
        takes: view.inputs.map(() => type?.name ?? "?"),
        links: view.inputs.map(() => !type ? HIDDEN_LINK : linkOf(type)),
    }
}

/** What a strip does when its cards are clicked or hovered. */
export interface ChainStripHost {
    /** A card was clicked. */
    pick(card: StripCard): void

    /** An empty slot was clicked. */
    plug(card: StripCard, slot: number): void

    /** Does the lifted card fit in an empty slot? */
    canPlug(card: StripCard, slot: number): boolean

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
                    const plugged = input ? add(input) : this.#slot(strip, slot, host, hover)
                    links.push({ from: card, to: plugged, color: strip.links[slot] })
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

    /** An empty slot of a card, added to the row. */
    #slot(strip: StripCard, slot: number, host: ChainStripHost, hover: (over: boolean) => void): Component {
        const empty = new SlotView(this.theme, strip.takes[slot], host.canPlug(strip, slot), this.cardPlace)
        empty.onPick = () => host.plug(strip, slot)
        empty.onHover = hover
        this.#row.add(empty)
        return empty
    }
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
