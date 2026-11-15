import type { Painter } from "../../gpu"

import { Component } from "../Component"
import type { UiEvent } from "../input/UiEvent"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import type { Theme } from "../Theme"

/** How a range slider is set up beyond its theme. */
export interface RangeSliderOptions {
    readonly min: number
    readonly max: number

    /** The smallest change of its bounds, which `left` and `right` move by, 1 by default. */
    readonly step?: number

    /** Its low bound at first, its minimum by default. */
    readonly low?: number

    /** Its high bound at first, its maximum by default. */
    readonly high?: number
}

/** One of the two thumbs of a range slider. */
type Thumb = "low"|"high"

/**
 * A range within a range, by steps: two thumbs, the low one never past the high one. The thumb nearest the
 * pointer is dragged, or set by a click on the track; `left` and `right` move the one touched last, the low
 * one at first. For the settings of the tools.
 */
export class RangeSlider extends Component {


    /** What hears of each change of its bounds, by the player or not, nothing when none. */
    public onChange: ((low: number, high: number) => void)|null = null

    public readonly min: number
    public readonly max: number
    public readonly step: number

    /**
     * @throws {@link Error} When the range is empty, or the step is not positive.
     */
    constructor(
        /** The look of the slider. */
        public readonly theme: Theme,

        options: RangeSliderOptions,
    ){
        super()
        if(!(options.max > options.min)){
            throw new Error(`A range slider from ${options.min} to ${options.max} has no range.`)
        }
        const step = options.step ?? 1
        if(!(step > 0)) throw new Error(`The step of a range slider is positive, not ${step}.`)
        this.min = options.min
        this.max = options.max
        this.step = step
        this.#low = this.#snapped(options.low ?? options.min)
        this.#high = Math.max(this.#low, this.#snapped(options.high ?? options.max))
    }


    /** Its low bound, snapped to a step, kept in the range and below the high bound. */
    public get low(): number { return this.#low }

    public set low(value: number){
        this.#set(Math.min(this.#snapped(value), this.#high), this.#high)
    }

    /** Its high bound, snapped to a step, kept in the range and above the low bound. */
    public get high(): number { return this.#high }

    public set high(value: number){
        this.#set(this.#low, Math.max(this.#snapped(value), this.#low))
    }


    protected override get interactive(): boolean {
        return true
    }

    protected override get focusable(): boolean {
        return true
    }

    protected computeHint(): SizeHint {
        const { thumbWidth, width, height } = this.theme.slider
        return sizeHint(3 * thumbWidth, height, width, height)
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        const { track, thumb, thumbWidth } = this.theme.slider
        const thumbSize = Math.min(thumbWidth, width)
        track.draw(painter, 0, 0, width, height)
        // The range between the thumbs, thinner than them.
        const lowX = this.#thumbX(this.#low)
        const highX = this.#thumbX(this.#high)
        const bar = Math.max(1, Math.round(height / 3))
        const between = highX - lowX - thumbSize
        if(between > 0) thumb.draw(painter, lowX + thumbSize, Math.round((height - bar) / 2), between, bar)
        thumb.draw(painter, lowX, 0, thumbSize, height)
        thumb.draw(painter, highX, 0, thumbSize, height)
        if(this.showsFocus) this.theme.focusRing.draw(painter, 0, 0, width, height)
    }

    protected override handle(event: UiEvent): void {
        switch(event.type){
            case "pointer-down":
                if(event.button !== 0) break
                this.#active = this.#nearest(event.x)
                this.#dragging = true
                this.#setFromPointer(event.x)
                event.consume()
                break
            case "pointer-move":
                if(!this.#dragging) break
                this.#setFromPointer(event.x)
                event.consume()
                break
            case "pointer-up":
                if(event.button !== 0 || !this.#dragging) break
                this.#dragging = false
                event.consume()
                break
            case "action":
                if(event.action !== "left" && event.action !== "right") break
                this[this.#active] += event.action === "left" ? -this.step : this.step
                event.consume()
                break
            default:
                break
        }
    }

    protected override focusChanged(): void {
        this.invalidate()
    }


    #low: number
    #high: number

    /** The thumb dragged, or moved by `left` and `right`. */
    #active: Thumb = "low"
    #dragging = false

    /** Take new bounds, telling them when they changed. */
    #set(low: number, high: number): void {
        if(low === this.#low && high === this.#high) return
        this.#low = low
        this.#high = high
        this.invalidate()
        this.onChange?.(low, high)
    }

    /** A value snapped to the nearest step from the minimum and kept in the range. */
    #snapped(value: number): number {
        const steps = Math.round((value - this.min) / this.step)
        // Rounded again, so a step of 0.1 gives 0.3 and not 0.30000000000000004.
        const snapped = Number((this.min + steps * this.step).toPrecision(12))
        return Math.min(this.max, Math.max(this.min, snapped))
    }

    /** Where the thumb of a value lies, in pixels from the left of the slider. */
    #thumbX(value: number): number {
        const travel = Math.max(0, this.bounds.width - this.theme.slider.thumbWidth)
        return Math.round(travel * (value - this.min) / (this.max - this.min))
    }

    /** The thumb nearest a point: on a tie, the one on the side of the point, the high one when both stand there. */
    #nearest(x: number): Thumb {
        const half = this.theme.slider.thumbWidth / 2
        const low = this.#thumbX(this.#low) + half
        const high = this.#thumbX(this.#high) + half
        const toLow = Math.abs(x - low)
        const toHigh = Math.abs(x - high)
        if(toLow !== toHigh) return toLow < toHigh ? "low" : "high"
        return x < low ? "low" : "high"
    }

    /** Set the active bound under the pointer, its thumb centered on it. */
    #setFromPointer(x: number): void {
        const thumbWidth = this.theme.slider.thumbWidth
        const travel = Math.max(1, this.bounds.width - thumbWidth)
        const ratio = (x - thumbWidth / 2) / travel
        this[this.#active] = this.min + ratio * (this.max - this.min)
    }
}
