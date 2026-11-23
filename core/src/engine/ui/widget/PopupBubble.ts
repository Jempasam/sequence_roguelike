import { Color } from "../../math"
import { Component, internals } from "../Component"
import type { Layer } from "../Layer"
import { Rect } from "../Rect"
import type { NineSlice } from "../NineSlice"
import type { Theme } from "../Theme"
import { DEFAULT_SIDES, placeBubble } from "./bubblePlacement"
import type { BubblePoint, BubbleSide, BubblePlacement } from "./bubblePlacement"
import { Panel } from "./Panel"

/** What a bubble is about: a point, a rectangle or a component, in virtual pixels of the layer. */
export type PopupBubbleTarget = { readonly x: number, readonly y: number }|Readonly<Rect>|Component

/** Where a bubble opens around its target. */
export interface PopupBubbleOptions {
    /** The sides to try, the most wanted first. Under, then over, by default. */
    readonly sides?: readonly BubbleSide[]

    /** The space left between the target and the bubble, in virtual pixels. None by default. */
    readonly gap?: number

    /**
     * A point the bubble should be as close to as it can while it stays off its target, such as the pointer
     * over a large one. None by default: the bubble is aligned to the start of its target.
     */
    readonly near?: Readonly<BubblePoint>
}

/** The look of the frame of a bubble: what it is drawn with, and the room it keeps around its content. */
export interface PopupBubbleFrame {
    readonly background: NineSlice
    readonly padding: number
}

/** How far right and down the shadow of a bubble lies from it, in virtual pixels. */
const SHADOW_OFFSET = 4

/** The color of the shadow: black, through which what lies under shows, in the shape of the frame. */
const SHADOW = new Color(0, 0, 0, 0.35)

/** How thick the outline of a bubble is, in virtual pixels, outside its frame. */
const OUTLINE_WIDTH = 1

/** The colors of the outline of a bubble: white, a light white, grey, and a dark grey. */
const OUTLINE_COLORS = {
    white: new Color(1, 1, 1), grey: new Color(0.65, 0.65, 0.65), dark: new Color(0.35, 0.35, 0.35),
}

/** How a bubble is outlined: none, or in white, grey or dark grey. */
export type BubbleOutline = "none"|"dark"|"grey"|"white"

/** A rectangle to read the area of a target, so showing a bubble allocates little. */
const AREA = new Rect()

/**
 * A bubble in a layer: a frame of the theme around a content, as large as the content asks for up to a
 * widest, and set beside its target on the side where it fits, as {@link placeBubble} does.
 *
 * @remarks
 * It is not a component: it adds its frame to the layer when shown, and takes it away when closed. Showing it
 * again changes its content, its size and its place without closing it. The frame takes neither the focus nor
 * the pointer, but its content may take the pointer: that is how the words of a text are hovered.
 */
export class PopupBubble {


    constructor(
        /** The layer it opens in, the popup layer in practice. */
        public readonly layer: Layer,

        /** The look of its frame. */
        public readonly theme: Theme,

        /** The widest it is, in virtual pixels, its frame included: a longer text goes on over more lines. */
        public readonly maxWidth = Infinity,

        /** What frames it, the one of the tooltips of the theme by default. */
        public readonly frame: PopupBubbleFrame = theme.tooltip,
    ){
        const { background, padding } = frame
        this.#panel = new Panel(theme, { background, padding, interactive: false })
        this.#outlines = {
            white: background.masked(OUTLINE_COLORS.white),
            grey: background.masked(OUTLINE_COLORS.grey),
            dark: background.masked(OUTLINE_COLORS.dark),
        }
        this.#outline = new Panel(theme, { background: this.#outlines.white, padding: 0, interactive: false })
        this.#outline.visible = false
        this.#shadow = new Panel(theme, {
            background: background.masked(SHADOW), padding: 0, interactive: false,
        })
    }


    /** Is it shown in the layer? */
    public get open(): boolean { return this.#panel.parent !== null }

    /** How it is outlined, to tell something of it: in white, grey or dark grey. None by default. */
    public get outline(): BubbleOutline { return this.#outlineKind }

    public set outline(outline: BubbleOutline){
        this.#outlineKind = outline
        this.#outline.visible = outline !== "none"
        if(outline !== "none") this.#outline.background = this.#outlines[outline]
    }

    /** Its frame. */
    public get panel(): Panel { return this.#panel }

    /** Where it was last placed, none before it is shown. */
    public get placement(): BubblePlacement|null { return this.#placement }

    /**
     * Show it with a content, beside a target. When it is shown already, it changes in place.
     *
     * @param content - What it holds, which it measures and holds until another is given.
     */
    public show(content: Component, target: PopupBubbleTarget, options: PopupBubbleOptions = {}): void {
        const panel = this.#panel
        if(panel.content !== content) panel.content = content
        const { padding } = this.frame
        const inner = this.maxWidth - 2 * padding
        const width = Math.min(content.measure(inner).preferredWidth, inner)
        const height = content.measure(width).preferredHeight
        const size = { width: width + 2 * padding, height: height + 2 * padding }
        panel.fixedSize = size
        this.#shadow.fixedSize = size
        const grown = 2 * OUTLINE_WIDTH
        this.#outline.fixedSize = { width: size.width + grown, height: size.height + grown }
        const { sides = DEFAULT_SIDES, gap = 0, near = null } = options
        const area = this.#areaOf(target)
        const placement = placeBubble(size, area, this.layer.content.bounds, sides, gap, near)
        this.#placement = placement
        const shadow = { offsetX: placement.x + SHADOW_OFFSET, offsetY: placement.y + SHADOW_OFFSET }
        const edge = placement.x - OUTLINE_WIDTH
        const outline = { offsetX: edge, offsetY: placement.y - OUTLINE_WIDTH }
        if(this.open){
            this.layer.content.setSlot(this.#shadow, shadow)
            this.layer.content.setSlot(this.#outline, outline)
            this.layer.content.setSlot(panel, { offsetX: placement.x, offsetY: placement.y })
            return
        }
        this.layer.content.add(this.#shadow, { x: "start", y: "start", ...shadow })
        this.layer.content.add(this.#outline, { x: "start", y: "start", ...outline })
        this.layer.content.add(panel, { x: "start", y: "start", offsetX: placement.x, offsetY: placement.y })
    }

    /** Take it out of the layer. It may be shown again. */
    public close(): void {
        if(this.open){
            this.layer.content.remove(this.#shadow)
            this.layer.content.remove(this.#outline)
            this.layer.content.remove(this.#panel)
        }
        this.#placement = null
    }


    readonly #panel: Panel

    /** The frame as a translucent silhouette under it, a little to the bottom right: its cast shadow. */
    readonly #shadow: Panel

    /** The frame as a silhouette, a little larger and under it, shown while the bubble is outlined. */
    readonly #outline: Panel
    #outlineKind: BubbleOutline = "none"
    readonly #outlines: Readonly<Record<Exclude<BubbleOutline, "none">, NineSlice>>
    #placement: BubblePlacement|null = null

    /** The rectangle of a target on the layer, a point being of no size. */
    #areaOf(target: PopupBubbleTarget): Readonly<Rect> {
        if(target instanceof Component){
            if(!internals.absoluteArea(target, AREA)) AREA.set(0, 0, 0, 0)
            return AREA
        }
        if("width" in target) return target
        return AREA.set(target.x, target.y, 0, 0)
    }
}
