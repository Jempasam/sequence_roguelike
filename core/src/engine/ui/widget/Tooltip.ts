import type { Component } from "../Component"
import type { Layer } from "../Layer"
import type { Theme } from "../Theme"
import type { UiRoot } from "../UiRoot"
import { placePopup } from "./ContextMenu"
import { Panel } from "./Panel"

/** How long the pointer stays over a component before its tooltip opens, in seconds. */
export const TOOLTIP_DELAY = 0.5

/** How far below the pointer a tooltip opens, in virtual pixels, so the cursor does not hide it. */
const POINTER_GAP = 12

/**
 * The bubbles of information of the components it is attached to, opened in a popup layer.
 *
 * @remarks
 * A bubble opens after {@link TOOLTIP_DELAY} of hovering, or as soon as its component takes the focus
 * with the keyboard or a gamepad: without the latter, a gamepad would have no tooltip at all. Its content
 * is built when it opens, by the function given, so the stats of an item are read when shown rather than
 * kept up to date all the time. It opens under the pointer or the component, flipped as a context menu
 * is, is not modal, and never takes the focus nor the pointer.
 */
export class Tooltip {


    constructor(
        /** The interface it follows the pointer and the focus of. */
        public readonly ui: UiRoot,

        /** The layer it opens in, the popup layer in practice. */
        public readonly layer: Layer,

        /** The look of its bubble. */
        public readonly theme: Theme,
    ){
        this.#ticks = ui.onUpdate(dt => this.#tick(dt))
    }


    /**
     * Attach a bubble to a component, until the returned handle is disposed.
     *
     * @param content - What the bubble shows, built each time it opens.
     */
    public attach(component: Component, content: () => Component): { dispose(): void } {
        this.#contents.set(component, content)
        return {
            dispose: () => {
                this.#contents.delete(component)
                if(this.#target === component) this.#close()
            },
        }
    }

    /** Close the bubble and stop following the interface. */
    public dispose(): void {
        this.#close()
        this.#ticks.dispose()
        this.#contents.clear()
    }


    readonly #ticks: { dispose(): void }
    readonly #contents = new Map<Component, () => Component>()

    /** The component the bubble is for, none when nothing is hovered or focused that has one. */
    #target: Component|null = null

    /** Did the target come from the focus, rather than the pointer? */
    #byFocus = false

    /** How long the target has been hovered, in seconds. */
    #elapsed = 0
    #bubble: Panel|null = null

    #tick(dt: number): void {
        const focused = this.ui.focused
        const byFocus = this.ui.focusVisible && focused !== null && this.#contents.has(focused)
        const target = byFocus ? focused : this.#attachedAround(this.ui.hovered)
        if(target !== this.#target){
            this.#close()
            this.#target = target
            this.#byFocus = byFocus
            this.#elapsed = 0
        }
        if(!target || this.#bubble) return
        this.#elapsed += dt
        if(this.#byFocus || this.#elapsed >= TOOLTIP_DELAY) this.#open(target)
    }

    /** The component itself or its nearest container that has a bubble attached, none when none has. */
    #attachedAround(component: Component|null): Component|null {
        for(let c = component; c; c = c.parent) if(this.#contents.has(c)) return c
        return null
    }

    #open(target: Component): void {
        const content = this.#contents.get(target)
        if(!content) return
        const { background, padding } = this.theme.tooltip
        const bubble = new Panel(this.theme, { background, padding, interactive: false })
        bubble.content = content()
        const at = this.#byFocus ? target : { x: this.ui.pointerX, y: this.ui.pointerY + POINTER_GAP }
        const [x, y] = placePopup(bubble, this.layer, at)
        this.layer.content.add(bubble, { x: "start", y: "start", offsetX: x, offsetY: y })
        this.#bubble = bubble
    }

    #close(): void {
        if(this.#bubble?.parent) this.layer.content.remove(this.#bubble)
        this.#bubble = null
    }
}
