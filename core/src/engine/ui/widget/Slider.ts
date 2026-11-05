import type { Painter } from "../../gpu"

import { Component } from "../Component"
import type { UiEvent } from "../input/UiEvent"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import type { Theme } from "../Theme"

/** How a slider is set up beyond its theme. */
export interface SliderOptions {
    readonly min: number
    readonly max: number

    /** The smallest change of its value, which `left` and `right` move by, 1 by default. */
    readonly step?: number

    /** Its value at first, its minimum by default. */
    readonly value?: number
}

/**
 * A value in a range, by steps: dragged, set by a click on the track, or moved with `left` and `right`.
 * For the settings of the menus.
 */
export class Slider extends Component {


    /** What hears of each change of its value, by the player or not, nothing when none. */
    public onChange: ((value: number) => void)|null = null

    public readonly min: number
    public readonly max: number
    public readonly step: number

    /**
     * @throws {@link Error} When the range is empty, or the step is not positive.
     */
    constructor(
        /** The look of the slider. */
        public readonly theme: Theme,

        options: SliderOptions,
    ){
        super()
        if(!(options.max > options.min)) throw new Error(`A slider from ${options.min} to ${options.max} has no range.`)
        const step = options.step ?? 1
        if(!(step > 0)) throw new Error(`The step of a slider is positive, not ${step}.`)
        this.min = options.min
        this.max = options.max
        this.step = step
        this.#value = this.#snapped(options.value ?? options.min)
    }


    /** Its value, snapped to a step and kept in the range. Setting the same one does nothing. */
    public get value(): number { return this.#value }

    public set value(value: number){
        const snapped = this.#snapped(value)
        if(snapped === this.#value) return
        this.#value = snapped
        this.invalidate()
        this.onChange?.(snapped)
    }


    protected override get interactive(): boolean {
        return true
    }

    protected override get focusable(): boolean {
        return true
    }

    protected computeHint(): SizeHint {
        const { thumbWidth, width, height } = this.theme.slider
        return sizeHint(2 * thumbWidth, height, width, height)
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        const { track, thumb, thumbWidth } = this.theme.slider
        track.draw(painter, 0, 0, width, height)
        thumb.draw(painter, this.#thumbX(), 0, Math.min(thumbWidth, width), height)
        if(this.showsFocus) this.theme.focusRing.draw(painter, 0, 0, width, height)
    }

    protected override handle(event: UiEvent): void {
        switch(event.type){
            case "pointer-down":
                if(event.button !== 0) break
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
                this.value += event.action === "left" ? -this.step : this.step
                event.consume()
                break
            default:
                break
        }
    }

    protected override focusChanged(): void {
        this.invalidate()
    }


    #value: number
    #dragging = false

    /** A value snapped to the nearest step from the minimum and kept in the range. */
    #snapped(value: number): number {
        const steps = Math.round((value - this.min) / this.step)
        // Rounded again, so a step of 0.1 gives 0.3 and not 0.30000000000000004.
        const snapped = Number((this.min + steps * this.step).toPrecision(12))
        return Math.min(this.max, Math.max(this.min, snapped))
    }

    /** Where the thumb lies, in pixels from the left of the slider. */
    #thumbX(): number {
        const travel = Math.max(0, this.bounds.width - this.theme.slider.thumbWidth)
        return Math.round(travel * (this.#value - this.min) / (this.max - this.min))
    }

    /** Set the value under the pointer, the thumb centered on it. */
    #setFromPointer(x: number): void {
        const thumbWidth = this.theme.slider.thumbWidth
        const travel = Math.max(1, this.bounds.width - thumbWidth)
        const ratio = (x - thumbWidth / 2) / travel
        this.value = this.min + ratio * (this.max - this.min)
    }
}
