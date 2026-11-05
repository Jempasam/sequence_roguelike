import type { Painter } from "../../gpu"

import type { Component } from "../Component"
import { ContentContainer } from "../Container"
import type { UiEvent } from "../input/UiEvent"
import type { NineSlice } from "../NineSlice"
import { Rect } from "../Rect"
import { EMPTY_HINT, paddedHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import type { StateLooks, Theme } from "../Theme"
import { Label } from "./Label"

/** How a button is set up beyond its theme and content. */
export interface ButtonOptions {
    /** Its frames in each state, with their padding, those of the buttons of the theme by default. */
    readonly looks?: StateLooks & { readonly padding: number }

    /** Can it be activated? Yes by default. */
    readonly enabled?: boolean
}

/**
 * A frame holding a content, which the pointer and the `accept` action activate.
 *
 * @remarks
 * It is activated by a release over it, after a press on it, as buttons usually are: pressing then leaving
 * cancels. Its frame follows its state: disabled, pressed, hovered, focused (only with the keyboard or a
 * gamepad), or normal.
 */
export class Button extends ContentContainer {


    /** What it does when activated, nothing when none. */
    public onActivate: (() => void)|null = null

    /**
     * @param content - What it shows: a text makes a label of the theme.
     */
    constructor(
        /** The look of the button. */
        public readonly theme: Theme,

        content: Component|string,
        options: ButtonOptions = {},
    ){
        super()
        this.#looks = options.looks ?? theme.button
        this.#enabled = options.enabled ?? true
        this.#label = typeof content === "string" ? new Label(theme, content, { align: "center" }) : null
        this.content = this.#label ?? content as Component
        this.#colorLabel()
    }


    /** Can it be activated and take the focus? Setting the same value does nothing. */
    public get enabled(): boolean { return this.#enabled }

    public set enabled(enabled: boolean){
        if(enabled === this.#enabled) return
        this.#enabled = enabled
        if(!enabled) this.#pressed = false
        this.#colorLabel()
        this.invalidate()
    }

    /** Is it held down by the pointer? */
    public get pressed(): boolean { return this.#pressed }

    /** Do what it does, as a click on it would. Does nothing while it is disabled. */
    public activate(): void {
        if(this.#enabled) this.onActivate?.()
    }


    protected override get interactive(): boolean {
        return true
    }

    protected override get focusable(): boolean {
        return this.#enabled
    }

    protected computeHint(maxWidth: number): SizeHint {
        const padding = this.#looks.padding
        const content = this.content
        const hint = content?.visible ? content.measure(maxWidth - 2 * padding) : EMPTY_HINT
        return paddedHint(hint, 2 * padding, 2 * padding)
    }

    protected override arranged(): void {
        const content = this.content
        if(!content?.visible) return
        const padding = this.#looks.padding
        const { width, height } = this.bounds
        this.place(content, this.#rect.set(padding, padding, Math.max(0, width - 2 * padding),
            Math.max(0, height - 2 * padding)))
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        this.#look().draw(painter, 0, 0, width, height)
    }

    protected override opaqueRect(): Readonly<Rect>|null {
        const { width, height } = this.bounds
        return this.#look().opaqueInterior(width, height, this.#opaque)
    }

    protected override handle(event: UiEvent): void {
        switch(event.type){
            case "pointer-down":
                if(event.button !== 0) break
                event.consume()
                if(!this.#enabled) break
                this.#pressed = true
                this.invalidate()
                break
            case "pointer-up": {
                if(event.button !== 0 || !this.#pressed) break
                event.consume()
                this.#pressed = false
                this.invalidate()
                const { width, height } = this.bounds
                const isOver = event.x >= 0 && event.y >= 0 && event.x < width && event.y < height
                if(isOver) this.activate()
                break
            }
            case "action":
                if(event.action !== "accept" || !this.#enabled) break
                event.consume()
                this.activate()
                break
            default:
                break
        }
    }

    protected override hoverChanged(): void {
        this.invalidate()
    }

    protected override focusChanged(): void {
        this.invalidate()
    }


    readonly #looks: StateLooks & { readonly padding: number }
    readonly #label: Label|null
    #enabled: boolean
    #pressed = false
    readonly #rect = new Rect()
    readonly #opaque = new Rect()

    /** The frame of its current state. */
    #look(): NineSlice {
        const looks = this.#looks
        if(!this.#enabled) return looks.disabled
        if(this.#pressed) return looks.pressed
        if(this.hovered) return looks.hovered
        if(this.showsFocus) return looks.focused
        return looks.normal
    }

    /** Give the label it made the color of its state. */
    #colorLabel(): void {
        if(!this.#label) return
        this.#label.color = this.#enabled ? this.theme.textColor : this.theme.disabledTextColor
    }
}
