import type { UiEvent } from "../input/UiEvent"
import type { Component } from "../Component"
import type { Theme } from "../Theme"
import { Button } from "./Button"
import type { ButtonOptions } from "./Button"

/** The way a step goes: forward, or back. */
export type StepDirection = 1 | -1

/**
 * A button that goes through values: a click steps forward, a click with shift held steps back, and the
 * wheel over it steps forward going up and back going down, without scrolling what lies around.
 */
export class StepButton extends Button {


    /** What it does for a step, nothing when none. */
    public onStep: ((direction: StepDirection) => void)|null = null

    constructor(theme: Theme, content: Component|string, options: ButtonOptions = {}){
        super(theme, content, options)
        this.onActivate = () => this.onStep?.(this.#direction)
    }


    protected override handle(event: UiEvent): void {
        switch(event.type){
            case "wheel":
                if(!this.enabled || !this.onStep || event.dy === 0) break
                this.onStep(event.dy < 0 ? 1 : -1)
                event.consume()
                return
            case "pointer-up":
                this.#direction = event.shift ? -1 : 1
                break
            case "action":
                this.#direction = 1
                break
            default:
                break
        }
        super.handle(event)
    }


    #direction: StepDirection = 1
}
