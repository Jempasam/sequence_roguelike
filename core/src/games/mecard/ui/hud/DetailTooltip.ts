import type { Sprite } from "../../../../engine/gpu"
import type { InputFrame } from "../../../../engine/input"
import type { Color } from "../../../../engine/math"
import { Paragraph, PopupBubble } from "../../../../engine/ui"
import type { BubbleOutline, BubbleSide, Layer, Rect, Theme, UiRoot } from "../../../../engine/ui"
import type { Removable } from "../../../../lifetime"
import type { Text } from "../../../../semantic"

import { explanationOf } from "../look/explanations"
import { PAPER_MARGIN, PAPER_TINT, paperFrame } from "../look/paper"
import { INK_TEXT } from "../look/theme"

import type { Detail, DetailListener, DetailShown } from "./Detail"

/** The mouse button that keeps the bubble aimed at, and lets the others go. */
const PIN_BUTTON = 2

/** How far from what a bubble is about it opens, in virtual pixels. */
const AREA_GAP = 2

/** The sides a bubble about a part of the screen opens on, under it first. */
const AREA_SIDES: readonly BubbleSide[] = ["below", "above", "right", "left"]

/** How far from a word a bubble about it opens, in virtual pixels. */
const WORD_GAP = 2

/** The sides a bubble about a word opens on, the right of the word first. */
const WORD_SIDES: readonly BubbleSide[] = ["right", "left", "below", "above"]

/** The widest a bubble is, in virtual pixels: a longer text goes on over more lines. */
const MAX_WIDTH = 200

/** How a tooltip is set up beyond its theme. */
export interface DetailTooltipOptions {
    /** The color of its text on the frame of the theme. */
    readonly color: Readonly<Color>

    /**
     * The worn paper to frame the bubbles with, in ink, read each time a bubble opens: none while it is not
     * loaded, or none at all, which frames them as the theme does.
     */
    readonly paper?: () => Sprite|null
}

/**
 * A bubble opened in the layer, the paragraph of its text, and, for the bubble of a word, the pinned bubble
 * the word lies in and the word.
 */
interface Bubble {
    readonly frame: PopupBubble
    readonly paragraph: Paragraph
    parent: Bubble|null
    link: object|null
}

/**
 * Tells what a {@link Detail} shows in a bubble beside what the text is about, off it and as near the pointer
 * as it can be, and lets the player keep bubbles open to read the words they explain, in the bubbles and in
 * the texts of the screen ({@link DetailTooltip.hearLink}).
 *
 * @remarks
 * The bubble that follows what is hovered is temporary, and opens while no bubble is pinned. A right click
 * pins it where it is. The pointer over a word of the last pinned bubble of a chain, one that has an
 * explanation, opens another temporary bubble beside the word, which a right click pins in turn: each bubble
 * knows the pinned bubble its word lies in. The words of an earlier bubble open nothing, but for a word whose
 * bubble is pinned already: it is aimed at.
 *
 * A right click keeps the bubble the pointer aims at, and the bubbles it comes from. That is the bubble of
 * the word hovered, else the pinned bubble under the pointer, else the temporary bubble. It pins the
 * temporary bubble when it is the one aimed at, and lets every other pinned bubble go, or all of them when
 * none is aimed at.
 *
 * The outline of a bubble tells what a right click would do to it:
 * - white: pinned, and it stays;
 * - grey: temporary, and it would be pinned;
 * - dark grey: pinned, and it would go.
 *
 * It opens no sooner than the detail says something, and takes neither the focus nor the pointer, but for
 * the words of a pinned bubble. It reads the input by {@link DetailTooltip.frame}.
 */
export class DetailTooltip implements DetailListener {


    constructor(
        /** The interface the pointer is read from. */
        public readonly ui: UiRoot,

        /** The layer the bubbles open in, the popup layer in practice. */
        public readonly layer: Layer,

        /** The look of its bubbles. */
        public readonly theme: Theme,

        private readonly options: DetailTooltipOptions,
    ){}


    /** How many bubbles are pinned. */
    public get pinned(): number { return this.#pinned.length }

    /** Is a temporary bubble open? */
    public get open(): boolean { return this.#temporary !== null }

    /** What the temporary bubble says, none when none is open. */
    public get text(): Text|null { return this.#temporary?.paragraph.text ?? null }

    /** How each bubble open is outlined: the pinned ones in order, then the temporary. */
    public get outlines(): readonly BubbleOutline[] {
        const bubbles = this.#temporary ? [...this.#pinned, this.#temporary] : this.#pinned
        return bubbles.map(bubble => bubble.frame.outline)
    }

    /** Tell what a detail shows, until the handle returned is removed. */
    public attach(detail: Detail): Removable {
        const listening = detail.listen(this)
        const handle = {
            remove: () => {
                listening.remove()
                const at = this.#attached.indexOf(handle)
                if(at >= 0) this.#attached.splice(at, 1)
            },
        }
        this.#attached.push(handle)
        return handle
    }

    /** Hear what a {@link Detail} shows: it is what is hovered. */
    public onShow(shown: DetailShown): void {
        this.#hovered = shown
        this.#refresh()
    }

    /** Hear that a {@link Detail} shows nothing any more. */
    public onHide(): void {
        this.#hovered = null
        this.#refresh()
    }

    /**
     * Hear that the pointer came over a word of a text of the screen, or left it. The word opens a bubble
     * beside it, as the word of a pinned bubble does, but none while a bubble is pinned, but for the bubble
     * of this word, which is then aimed at. Its bubble comes from no other: a right click pins it as a root.
     */
    public readonly hearLink = (link: object|null, area: Readonly<Rect>|null): void => {
        const text = link && area ? explanationOf(link) : undefined
        const known = link !== null && this.#pinnedAt(null, link) !== undefined
        const heard = link && area && text !== undefined && (this.#pinned.length === 0 || known)
        this.#word = heard ? { text, area, owner: null, link } : null
        this.#refresh()
    }

    /** Read a frame of the input: a right click keeps the bubble aimed at. */
    public frame(input: InputFrame): void {
        for(const event of input.events){
            if(event.type === "pointer-down" && event.button === PIN_BUTTON) this.#click()
        }
        this.#paint()
    }

    /** Forget what was hovered, as the details it came from are built again: the temporary bubble closes. */
    public reset(): void {
        this.#hovered = null
        this.#word = null
        this.#refresh()
    }

    /** Close every bubble, and stop hearing the details attached. */
    public dispose(): void {
        for(const handle of [...this.#attached]) handle.remove()
        this.#hovered = null
        this.#word = null
        this.#closeTemporary()
        this.#releasePinned()
    }


    /** What the pointer hovers in the details: what it says, and what that is about. */
    #hovered: DetailShown|null = null

    /** The word of a pinned bubble the pointer is over: its explanation, its place and its bubble. */
    #word: {
        readonly text: Text
        readonly area: Readonly<Rect>
        readonly owner: Bubble|null
        readonly link: object
    }|null = null

    #temporary: Bubble|null = null
    readonly #pinned: Bubble[] = []
    readonly #attached: Removable[] = []

    /**
     * The pinned bubble that explains a word of a pinned bubble, or of the screen when the owner is none,
     * none when the word has none.
     */
    #pinnedAt(owner: Bubble|null, link: object): Bubble|undefined {
        return this.#pinned.find(bubble => bubble.parent === owner && bubble.link === link)
    }

    /**
     * What the temporary bubble should say now: the word explained first, else what is hovered, which says
     * nothing while a bubble is pinned: only the last bubble of a chain opens more.
     */
    #wanted(): Text|null {
        const word = this.#word
        if(word) return this.#pinnedAt(word.owner, word.link) ? null : word.text
        return this.#pinned.length > 0 ? null : this.#hovered?.text ?? null
    }

    /** Open, change or close the temporary bubble to say what it should, and outline the bubbles. */
    #refresh(): void {
        const wanted = this.#wanted()
        if(wanted === null){
            this.#closeTemporary()
        } else {
            const bubble = this.#temporary ?? this.#openTemporary(wanted)
            bubble.parent = this.#word?.owner ?? null
            bubble.link = this.#word?.link ?? null
            bubble.paragraph.text = wanted
            this.#lay(bubble)
        }
        this.#paint()
    }

    #openTemporary(text: Text): Bubble {
        const paper = this.options.paper?.() ?? null
        const look = paper
            ? { background: paperFrame(paper, 1), padding: PAPER_MARGIN / 2 + 3 }
            : this.theme.tooltip
        const frame = new PopupBubble(this.layer, this.theme, MAX_WIDTH, look)
        const paragraph = new Paragraph(this.theme, text, {
            color: paper ? INK_TEXT : this.options.color, ...paper ? { backdrop: PAPER_TINT } : {},
        })
        this.#temporary = { frame, paragraph, parent: null, link: null }
        return this.#temporary
    }

    /**
     * Show a bubble by the word explained, or beside what is hovered, off it and as near the pointer as it
     * can be.
     */
    #lay(bubble: Bubble): void {
        const word = this.#word
        if(word){
            bubble.frame.show(bubble.paragraph, word.area, { sides: WORD_SIDES, gap: WORD_GAP })
            return
        }
        const hovered = this.#hovered
        if(hovered){
            bubble.frame.show(bubble.paragraph, hovered.area, {
                sides: AREA_SIDES,
                gap: AREA_GAP,
                near: hovered.point,
            })
            return
        }
        const { pointerX: x, pointerY: y } = this.ui
        bubble.frame.show(bubble.paragraph, { x, y }, { gap: AREA_GAP })
    }

    #closeTemporary(): void {
        const bubble = this.#temporary
        if(!bubble) return
        this.#temporary = null
        bubble.frame.close()
    }

    /**
     * The bubble the pointer aims at: the one of the word it is over, else the pinned bubble under it, else
     * the temporary bubble. None when it aims at no bubble.
     */
    #target(): Bubble|null {
        const word = this.#word
        if(word) return this.#pinnedAt(word.owner, word.link) ?? this.#temporary
        const { pointerX: x, pointerY: y } = this.ui
        for(let at = this.#pinned.length - 1; at >= 0; at--){
            if(this.#pinned[at].frame.panel.containsAbsolute(x, y)) return this.#pinned[at]
        }
        return this.#temporary
    }

    /** A bubble and the bubbles it comes from: what a right click leaves when the pointer aims at it. */
    #lineage(bubble: Bubble|null): Set<Bubble> {
        const kept = new Set<Bubble>()
        for(let each = bubble; each; each = each.parent) kept.add(each)
        return kept
    }

    /** Outline each bubble by what a right click would do to it. */
    #paint(): void {
        const kept = this.#lineage(this.#target())
        for(const bubble of this.#pinned) bubble.frame.outline = kept.has(bubble) ? "white" : "dark"
        const temporary = this.#temporary
        if(temporary) temporary.frame.outline = kept.has(temporary) ? "grey" : "none"
    }

    /** Pin the bubble aimed at if it is temporary, keep it and its parents, and let the others go. */
    #click(): void {
        const target = this.#target()
        if(!target){
            this.#releasePinned()
            return
        }
        if(target === this.#temporary) this.#pin(target)
        const kept = this.#lineage(target)
        for(const bubble of this.#pinned){
            if(!kept.has(bubble)) bubble.frame.close()
        }
        this.#pinned.splice(0, this.#pinned.length, ...this.#pinned.filter(bubble => kept.has(bubble)))
        if(this.#word?.owner && !kept.has(this.#word.owner)) this.#word = null
        this.#refresh()
    }

    /** Keep the temporary bubble where it is, so it is pinned. */
    #pin(bubble: Bubble): void {
        this.#temporary = null
        bubble.paragraph.onLink = (link, area) => this.#hoverWord(bubble, link, area)
        this.#pinned.push(bubble)
    }

    #releasePinned(): void {
        for(const bubble of this.#pinned) bubble.frame.close()
        this.#pinned.length = 0
        this.#word = null
        this.#refresh()
    }

    /**
     * Hear that the pointer came over a word of a pinned bubble, or left it. Only the last bubble of a chain
     * opens a bubble for its words, but the words of an earlier one tell of the bubble they already have.
     */
    #hoverWord(owner: Bubble, link: object|null, area: Readonly<Rect>|null): void {
        const text = link && area ? explanationOf(link) : undefined
        const known = link !== null && this.#pinnedAt(owner, link) !== undefined
        const last = !this.#pinned.some(bubble => bubble.parent === owner)
        const heard = link && area && text !== undefined && (last || known)
        this.#word = heard ? { text, area, owner, link } : null
        this.#refresh()
    }
}
