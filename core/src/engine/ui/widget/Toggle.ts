import type { StateLooks, Theme } from "../Theme"
import { Button } from "./Button"

/**
 * A button with two states, on and off: a click turns it over. It shows the pressed frame of the buttons
 * while it is on, as the tab of the page shown does.
 */
export class Toggle extends Button {


    /** What it does when a click turns it over, nothing when none. Setting its value does not call it. */
    public onChange: ((value: boolean) => void)|null = null

    constructor(theme: Theme, label: string, value = false){
        super(theme, label)
        const pressed = theme.button.pressed
        this.#on = { ...theme.button, normal: pressed, hovered: pressed, focused: pressed }
        this.#value = value
        this.#style()
        this.onActivate = () => {
            this.value = !this.#value
            this.onChange?.(this.#value)
        }
    }


    /** Is it on? */
    public get value(): boolean { return this.#value }

    public set value(value: boolean){
        if(value === this.#value) return
        this.#value = value
        this.#style()
    }


    #value: boolean
    readonly #on: StateLooks & { readonly padding: number }

    /** Show the frame of its state. */
    #style(): void {
        this.looks = this.#value ? this.#on : this.theme.button
    }
}
