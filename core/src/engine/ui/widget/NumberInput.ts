import { ContentContainer } from "../Container"
import type { UiEvent } from "../input/UiEvent"
import { Rect } from "../Rect"
import type { SizeHint } from "../SizeHint"
import type { Theme } from "../Theme"
import { TextInput } from "./TextInput"

/** How a number field is set up beyond its theme. */
export interface NumberInputOptions {
    /** The bounds of its value, none by default. */
    readonly min?: number
    readonly max?: number

    /** The smallest change of its value, which `up`, `down` and the wheel move by, 1 by default. */
    readonly step?: number

    /** Its value at first, 0 kept in its bounds by default. */
    readonly value?: number
}

/**
 * A number, with bounds and a step: a {@link TextInput} accepting only what a number is written with,
 * composed rather than built in.
 *
 * @remarks
 * `up`, `down` and the wheel add or take a step. On a commit, the text is read, kept in the bounds and
 * snapped to the step. A text that is no number brings back the value from before, and the field shows
 * it: the failure is visible, not silent.
 */
export class NumberInput extends ContentContainer {


    /** What hears of each change of its value, nothing when none. */
    public onChange: ((value: number) => void)|null = null

    /** The text field it is made of. */
    public readonly field: TextInput

    public readonly min: number
    public readonly max: number
    public readonly step: number

    /**
     * @throws {@link Error} When the step is not positive, or the bounds are crossed.
     */
    constructor(theme: Theme, options: NumberInputOptions = {}){
        super()
        this.min = options.min ?? -Infinity
        this.max = options.max ?? Infinity
        this.step = options.step ?? 1
        if(!(this.step > 0)) throw new Error(`The step of a number field is positive, not ${this.step}.`)
        if(this.min > this.max) throw new Error(`A number field from ${this.min} to ${this.max} has no range.`)
        this.#decimals = decimalsOf(this.step)
        const allowsSign = this.min < 0
        const allowsPoint = this.#decimals > 0
        this.field = new TextInput(theme, {
            accepts: character => /[0-9]/.test(character)
                || (allowsSign && character === "-")
                || (allowsPoint && (character === "." || character === ",")),
        })
        this.field.onCommit = text => this.#read(text)
        this.content = this.field
        this.#value = this.#bounded(options.value ?? 0)
        this.field.text = this.#format(this.#value)
    }


    /** Its value, kept in its bounds and snapped to its step. Setting the same one does nothing. */
    public get value(): number { return this.#value }

    public set value(value: number){
        const bounded = this.#bounded(value)
        this.field.text = this.#format(bounded)
        if(bounded === this.#value) return
        this.#value = bounded
        this.onChange?.(bounded)
    }


    protected computeHint(maxWidth: number): SizeHint {
        return this.field.measure(maxWidth)
    }

    /** Draws nothing of its own: its children draw. */
    protected paint(): void {}

    protected override arranged(): void {
        this.place(this.field, this.#rect.set(0, 0, this.bounds.width, this.bounds.height))
    }

    protected override handle(event: UiEvent): void {
        switch(event.type){
            case "action":
                if(event.action !== "up" && event.action !== "down") break
                this.value = this.#value + (event.action === "up" ? this.step : -this.step)
                event.consume()
                break
            case "wheel":
                if(event.dy === 0) break
                this.value = this.#value - Math.sign(event.dy) * this.step
                event.consume()
                break
            default:
                break
        }
    }


    readonly #decimals: number
    #value: number
    readonly #rect = new Rect()

    /** Read a committed text: a number takes its place, anything else brings the value back on screen. */
    #read(text: string): void {
        const written = text.trim().replace(",", ".")
        const number = Number(written)
        if(written === "" || !Number.isFinite(number)){
            this.field.text = this.#format(this.#value)
            return
        }
        this.value = number
    }

    /** A value snapped to the step from the minimum, or from 0 without one, and kept in the bounds. */
    #bounded(value: number): number {
        const from = Number.isFinite(this.min) ? this.min : 0
        const snapped = from + Math.round((value - from) / this.step) * this.step
        return Math.min(this.max, Math.max(this.min, Number(snapped.toFixed(this.#decimals))))
    }

    #format(value: number): string {
        return value.toFixed(this.#decimals)
    }
}

/** How many decimals a step is written with: 0 for 1, 2 for 0.25. */
function decimalsOf(step: number): number {
    const written = String(step)
    const point = written.indexOf(".")
    return point < 0 ? 0 : written.length - point - 1
}
