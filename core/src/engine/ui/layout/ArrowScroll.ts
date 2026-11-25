import { Container } from "../Container"
import type { Component } from "../Component"
import { Rect } from "../Rect"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import type { Theme } from "../Theme"
import { Button } from "../widget/Button"
import { Scroll } from "./Scroll"

/** How a scroll with arrows is set up. */
export interface ArrowScrollOptions {
    /** How wide the arrow buttons are at least, in virtual pixels, 14 by default. */
    readonly buttonWidth?: number

    /** What the arrow buttons say: `"<"` and `">"` by default. */
    readonly leftText?: string
    readonly rightText?: string
}

/** The share of the view that an arrow scrolls by, so a little of what was seen stays in sight. */
const ARROW_STEP_SHARE = 0.8

/**
 * A row of content that scrolls across, by two large buttons over its edges: the left one shows only when the
 * content can scroll left, the right one only when it can scroll right.
 *
 * @remarks
 * It is as high as its content, so nothing overflows below, and as wide as the room it is given. The wheel
 * does not move it: it goes on to what lies around, so a page of such rows still scrolls under the pointer.
 */
export class ArrowScroll extends Container<object> {


    constructor(
        /** The look of the buttons. */
        public readonly theme: Theme,

        options: ArrowScrollOptions = {},
    ){
        super()
        this.#buttonWidth = options.buttonWidth ?? 14
        this.#scroll = new Scroll(theme, { axis: "horizontal", width: 1, height: 1, bar: false, wheel: false })
        this.#left = new Button(theme, options.leftText ?? "<")
        this.#right = new Button(theme, options.rightText ?? ">")
        this.#left.visible = false
        this.#right.visible = false
        this.#left.onActivate = () => this.#move(-1)
        this.#right.onActivate = () => this.#move(1)
        this.add(this.#scroll)
        this.add(this.#left)
        this.add(this.#right)
        this.#scroll.onScrolled = () => this.#refreshArrows()
    }


    /** What scrolls, none when empty. */
    public get content(): Component|null { return this.#scroll.content }

    public set content(content: Component|null){
        this.#scroll.content = content
    }

    /** The scroll under the buttons. */
    public get scroll(): Scroll { return this.#scroll }

    /** The button over the left edge, visible when the content can scroll left. */
    public get leftButton(): Button { return this.#left }

    /** The button over the right edge, visible when the content can scroll right. */
    public get rightButton(): Button { return this.#right }

    public override get childrenMayOverlap(): boolean {
        return true
    }


    protected defaultSlot(): object {
        return {}
    }

    protected computeHint(maxWidth: number): SizeHint {
        const content = this.#scroll.content
        const hint = content?.visible ? content.measure(Infinity) : null
        const width = Number.isFinite(maxWidth) ? maxWidth : hint?.preferredWidth ?? 0
        return sizeHint(0, hint?.preferredHeight ?? 0, width, hint?.preferredHeight ?? 0)
    }

    /** Draws nothing of its own: its children draw. */
    protected paint(): void {}

    protected override arranged(): void {
        const { width, height } = this.bounds
        const rect = this.#rect
        this.place(this.#scroll, rect.set(0, 0, width, height))
        const left = this.#widthOf(this.#left, width)
        const right = this.#widthOf(this.#right, width)
        this.place(this.#left, rect.set(0, 0, left, height))
        this.place(this.#right, rect.set(width - right, 0, right, height))
        this.#refreshArrows()
    }


    readonly #buttonWidth: number
    readonly #scroll: Scroll
    readonly #left: Button
    readonly #right: Button
    readonly #rect = new Rect()

    /** How wide an arrow is: its own width, at least the least one, at most half of the room. */
    #widthOf(button: Button, room: number): number {
        return Math.min(room / 2, Math.max(this.#buttonWidth, button.measure(room).preferredWidth))
    }

    /** Show each arrow only when the content can scroll the way it points. */
    #refreshArrows(): void {
        const { offset, maxOffset } = this.#scroll
        this.#left.visible = offset > 0
        this.#right.visible = offset < maxOffset
    }

    /** Scroll a share of the view, left for -1 and right for 1. */
    #move(way: -1|1): void {
        const step = Math.max(1, Math.floor(this.bounds.width * ARROW_STEP_SHARE))
        this.#scroll.offset += way * step
    }
}
