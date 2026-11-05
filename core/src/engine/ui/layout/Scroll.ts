import type { Painter } from "../../gpu"

import { ContentContainer } from "../Container"
import type { UiEvent } from "../input/UiEvent"
import { Rect } from "../Rect"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import type { Theme } from "../Theme"

/** How far a notch of the wheel scrolls, in virtual pixels. */
export const WHEEL_STEP = 16

/** How a viewport is set up. */
export interface ScrollOptions {
    /** The axis its content scrolls along, `"vertical"` by default. */
    readonly axis?: "vertical"|"horizontal"

    /** The size it asks for, in virtual pixels, whatever its content: it accepts down to nothing. */
    readonly width: number
    readonly height: number

    /**
     * Does its bar show when the content overflows? True by default. Without it the content keeps the whole
     * viewport.
     */
    readonly bar?: boolean

    /**
     * Does the wheel scroll it? True by default. Without it the wheel goes on to what lies around, and the
     * content only moves by the bar, the focus and its offset.
     */
    readonly wheel?: boolean
}

/**
 * A viewport scrolling a content larger than itself.
 *
 * @remarks
 * Its size comes from its options, not from its content: it is a layout boundary, so a content that grows
 * never lays out what lies around. The content is measured at the width of the viewport for a vertical
 * scroll, at its height for a horizontal one, and without limit along the axis that scrolls.
 *
 * The bar shows only when the content overflows, on the side of the viewport, never over the content, and
 * can be turned off, as can the wheel. It scrolls with the wheel, by dragging its thumb, and by itself when
 * the focus moves to a child out of view: without the latter, a long menu would be unusable with a gamepad.
 */
export class Scroll extends ContentContainer {


    /** The axis its content scrolls along. */
    public readonly axis: "vertical"|"horizontal"

    constructor(
        /** The look of its bar. */
        public readonly theme: Theme,

        options: ScrollOptions,
    ){
        super()
        this.axis = options.axis ?? "vertical"
        this.#width = options.width
        this.#height = options.height
        this.#showsBar = options.bar ?? true
        this.#followsWheel = options.wheel ?? true
    }


    /**
     * How far the content is scrolled, in whole virtual pixels, from 0 to how far it overflows. Changing it
     * draws the viewport again, without laying anything out.
     */
    public get offset(): number { return this.#offset }

    public set offset(offset: number){
        const clamped = Math.max(0, Math.min(this.#maxOffset, Math.round(offset)))
        if(clamped === this.#offset) return
        this.#offset = clamped
        this.invalidate()
    }

    /** Does the content overflow, so it can scroll? */
    public get overflows(): boolean { return this.#overflows }

    /** Scroll to the end of the content, once it is laid out: what was just added to it comes into view. */
    public scrollToEnd(): void {
        this.#toEnd = true
        this.invalidateLayout()
    }

    /** Change the size it asks for. */
    public resize(width: number, height: number): void {
        if(width === this.#width && height === this.#height) return
        this.#width = width
        this.#height = height
        this.invalidateLayout()
    }


    protected override get isLayoutBoundary(): boolean {
        return true
    }

    protected override get interactive(): boolean {
        return true
    }

    protected override get scrollX(): number {
        return this.axis === "horizontal" ? this.#offset : 0
    }

    protected override get scrollY(): number {
        return this.axis === "vertical" ? this.#offset : 0
    }

    protected override viewport(): Readonly<Rect> {
        return this.#viewport
    }

    protected computeHint(): SizeHint {
        return sizeHint(0, 0, this.#width, this.#height)
    }

    protected override arranged(): void {
        const { width, height } = this.bounds
        const content = this.content
        const bar = this.theme.scrollbar.width
        const isVertical = this.axis === "vertical"
        if(!content?.visible){
            this.#overflows = false
            this.#hasBar = false
            this.#maxOffset = 0
            this.#viewport.set(0, 0, width, height)
            this.#offset = 0
            return
        }
        const full = isVertical
            ? content.measure(width).preferredHeight
            : content.measure(Infinity).preferredWidth
        const viewLength = isVertical ? height : width
        this.#overflows = full > viewLength
        this.#hasBar = this.#overflows && this.#showsBar
        const barWidth = this.#hasBar ? Math.min(bar, isVertical ? width : height) : 0
        if(isVertical){
            this.#viewport.set(0, 0, width - barWidth, height)
            const length = Math.max(height, content.measure(width - barWidth).preferredHeight)
            this.place(content, this.#rect.set(0, 0, width - barWidth, length))
            this.#maxOffset = length - height
        } else {
            this.#viewport.set(0, 0, width, height - barWidth)
            const length = Math.max(width, full)
            this.place(content, this.#rect.set(0, 0, length, height - barWidth))
            this.#maxOffset = length - width
        }
        // Set again, so it is clamped to what the content overflows by now.
        this.offset = this.#toEnd ? this.#maxOffset : this.#offset
        this.#toEnd = false
    }

    protected paint(painter: Painter): void {
        if(!this.#hasBar) return
        const { track, thumb } = this.theme.scrollbar
        const bar = this.#barRect(this.#rect)
        track.draw(painter, bar.x, bar.y, bar.width, bar.height)
        const knob = this.#thumbRect(this.#knob)
        thumb.draw(painter, knob.x, knob.y, knob.width, knob.height)
    }

    protected override handle(event: UiEvent): void {
        switch(event.type){
            case "wheel": {
                if(!this.#followsWheel) break
                const notches = this.axis === "vertical" ? event.dy : event.dy || event.dx
                this.offset += notches * WHEEL_STEP
                event.consume()
                break
            }
            case "pointer-down":
                const onBar = this.#hasBar && this.#barRect(this.#rect).containsPoint(event.x, event.y)
                if(event.button === 0 && onBar){
                    this.#startDrag(event)
                    event.consume()
                }
                break
            case "pointer-move":
                if(this.#dragFrom !== null){
                    this.#dragTo(event)
                    event.consume()
                }
                break
            case "pointer-up":
                if(event.button === 0 && this.#dragFrom !== null){
                    this.#dragFrom = null
                    event.consume()
                }
                break
            default:
                break
        }
    }

    protected override reveal(rect: Readonly<Rect>): void {
        const isVertical = this.axis === "vertical"
        const start = isVertical ? rect.y : rect.x
        const end = isVertical ? rect.y + rect.height : rect.x + rect.width
        const length = isVertical ? this.#viewport.height : this.#viewport.width
        if(start < this.#offset) this.offset = start
        else if(end > this.#offset + length) this.offset = end - length
    }


    #width: number
    #height: number
    #offset = 0

    /** Is it to go to the end of the content at its next layout? */
    #toEnd = false
    #maxOffset = 0

    /** May its bar show at all? */
    readonly #showsBar: boolean

    /** Does the wheel scroll it? */
    readonly #followsWheel: boolean

    #overflows = false

    /** Is its bar shown, taking room from the viewport? */
    #hasBar = false
    readonly #viewport = new Rect()
    readonly #rect = new Rect()
    readonly #knob = new Rect()

    /** Where the thumb was grabbed, in pixels along the bar from its start, none when not dragged. */
    #dragFrom: number|null = null

    /** The zone of the bar, in its own coordinates, written in a rectangle. */
    #barRect(out: Rect): Rect {
        const { width, height } = this.bounds
        const viewport = this.#viewport
        return this.axis === "vertical"
            ? out.set(viewport.width, 0, width - viewport.width, height)
            : out.set(0, viewport.height, width, height - viewport.height)
    }

    /** The zone of the thumb, in its own coordinates, written in a rectangle. */
    #thumbRect(out: Rect): Rect {
        const bar = this.#barRect(out)
        const isVertical = this.axis === "vertical"
        const barLength = isVertical ? bar.height : bar.width
        const viewLength = barLength
        const contentLength = viewLength + this.#maxOffset
        const length = Math.min(barLength,
            Math.max(this.theme.scrollbar.minThumb, Math.floor(barLength * viewLength / contentLength)))
        const travel = barLength - length
        const position = this.#maxOffset === 0 ? 0 : Math.floor(travel * this.#offset / this.#maxOffset)
        return isVertical
            ? out.set(bar.x, bar.y + position, bar.width, length)
            : out.set(bar.x + position, bar.y, length, bar.height)
    }

    /** Grab the thumb, or move it under the pointer first when the track was pressed beside it. */
    #startDrag(event: UiEvent): void {
        const along = this.axis === "vertical" ? event.y : event.x
        const knob = this.#thumbRect(this.#knob)
        const knobStart = this.axis === "vertical" ? knob.y : knob.x
        const knobLength = this.axis === "vertical" ? knob.height : knob.width
        const onThumb = along >= knobStart && along < knobStart + knobLength
        this.#dragFrom = onThumb ? along - knobStart : Math.floor(knobLength / 2)
        this.#dragTo(event)
    }

    /** Scroll so the grabbed point of the thumb lies under the pointer. */
    #dragTo(event: UiEvent): void {
        const along = this.axis === "vertical" ? event.y : event.x
        const knob = this.#thumbRect(this.#knob)
        const knobLength = this.axis === "vertical" ? knob.height : knob.width
        const barLength = this.axis === "vertical" ? this.bounds.height : this.bounds.width
        const travel = barLength - knobLength
        if(travel <= 0) return
        this.offset = (along - (this.#dragFrom ?? 0)) * this.#maxOffset / travel
    }
}
