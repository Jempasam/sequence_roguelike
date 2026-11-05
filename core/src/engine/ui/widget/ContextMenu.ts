import { internals } from "../Component"
import type { Component } from "../Component"
import type { UiEvent } from "../input/UiEvent"
import type { Layer } from "../Layer"
import { Box } from "../layout/Box"
import { Rect } from "../Rect"
import type { Theme } from "../Theme"
import { Button } from "./Button"
import { Label } from "./Label"
import { Panel } from "./Panel"

/** An entry of a context menu. */
export interface MenuEntry {
    readonly label: string

    /** What choosing it does, once the menu is closed. */
    readonly action: () => void

    /** Can it be chosen? Yes by default. */
    readonly enabled?: boolean
}

/** Where a popup opens: at a point of the texture, in virtual pixels, or under a component. */
export type PopupAnchor = { readonly x: number, readonly y: number }|Component

/**
 * A list of actions, opened in a popup layer, modal while open.
 *
 * @remarks
 * It opens at the pointer or under a component, flipped to stay on screen: to the left of the point when
 * it overflows on the right, above it when it overflows at the bottom. It closes on a choice, on `cancel`,
 * or on a press outside it. It moves with the keyboard and the gamepad as a column, and gives the focus
 * back, when it closes, to what had it.
 */
export class ContextMenu extends Panel {


    constructor(
        theme: Theme,

        /** The layer it opens in, the popup layer in practice. */
        public readonly layer: Layer,

        entries: readonly MenuEntry[] = [],
    ){
        super(theme, { background: theme.menu.background, padding: theme.menu.padding })
        this.content = this.#list
        this.entries = entries
    }


    /** The entries, in order. Setting them builds the list again. */
    public get entries(): readonly MenuEntry[] { return this.#entries }

    public set entries(entries: readonly MenuEntry[]){
        this.#entries = entries
        for(const child of [...this.#list.children]) this.#list.remove(child)
        for(const entry of entries){
            const label = new Label(this.theme, entry.label)
            const looks = this.theme.menu.entry
            const button = new Button(this.theme, label, { looks, enabled: entry.enabled ?? true })
            label.color = button.enabled ? this.theme.textColor : this.theme.disabledTextColor
            button.onActivate = () => {
                this.close()
                entry.action()
            }
            this.#list.add(button)
        }
    }

    /** Is it open? */
    public get isOpen(): boolean { return this.parent === this.layer.content }

    /**
     * Open it, or move it when open, then give the focus to its first entry that can be chosen.
     *
     * @param at - A point of the texture, or a component to open under.
     */
    public open(at: PopupAnchor): void {
        const previous = internals.hostOf(this.layer.content)?.focused ?? null
        if(!this.isOpen) this.#previousFocus = previous
        const [x, y] = placePopup(this, this.layer, at)
        const slot = { x: "start", y: "start", offsetX: x, offsetY: y } as const
        if(this.isOpen) this.layer.content.setSlot(this, slot)
        else this.layer.content.add(this, slot)
        const first = this.#list.children.find(child => child instanceof Button && child.enabled)
        first?.focus()
    }

    /** Close it, giving the focus back to what had it when it opened. Closing it closed does nothing. */
    public close(): void {
        if(!this.isOpen) return
        this.layer.content.remove(this)
        const previous = this.#previousFocus
        this.#previousFocus = null
        if(previous && internals.shownHostOf(previous) && internals.isFocusable(previous)) previous.focus()
    }


    protected override get modal(): boolean {
        return true
    }

    protected override pressedOutside(): void {
        this.close()
    }

    protected override handle(event: UiEvent): void {
        if(event.type !== "action" || event.action !== "cancel") return
        this.close()
        event.consume()
    }


    readonly #list = new Box("column")
    #entries: readonly MenuEntry[] = []
    #previousFocus: Component|null = null
}

/** A rectangle to compute where a popup opens, so opening one allocates little. */
const ANCHOR = new Rect()

/**
 * Where a popup of its preferred size opens, in coordinates of the texture: at a point or under a
 * component, flipped to the left or above when it would overflow, and kept on the texture.
 */
export function placePopup(popup: Component, layer: Layer, at: PopupAnchor): [number, number] {
    const hint = popup.measure(Infinity)
    const width = hint.preferredWidth
    const height = hint.preferredHeight
    const room = layer.content.bounds
    const isPoint = !("bounds" in at)
    if(isPoint) ANCHOR.set(at.x, at.y, 0, 0)
    else if(!internals.absoluteArea(at, ANCHOR)) ANCHOR.set(0, 0, 0, 0)
    let x = ANCHOR.x
    let y = ANCHOR.bottom
    if(x + width > room.width) x = (isPoint ? ANCHOR.x : ANCHOR.right) - width
    if(y + height > room.height) y = ANCHOR.y - height
    x = Math.max(0, Math.min(x, room.width - width))
    y = Math.max(0, Math.min(y, room.height - height))
    return [x, y]
}
