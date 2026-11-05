import { DIRECTION_AXES, internals } from "../Component"
import type { Component } from "../Component"
import { Container } from "../Container"
import { Rect } from "../Rect"
import type { UiAction } from "./UiAction"

/**
 * Which component has the focus, and how it moves.
 *
 * @remarks
 * The navigation follows the tree, not the geometry. A direction climbs from the focused component, and
 * the first container navigating along that axis gives the focus to the next focusable component in its
 * order: a column takes `up` and `down`, not `left` and `right`. At its end, the direction climbs further.
 * It is predictable, and a menu moves exactly in the order it was written. Entering a sibling, the focus
 * lands on the first focusable component inside it.
 *
 * `next` and `previous` go through every focusable component of the scope in the order of the tree, as
 * `tab` does, and wrap around.
 */
export class Focus {


    /**
     * @param scope - The contents the focus may move within: the modal layer on top, or every layer.
     */
    constructor(scope: () => readonly Component[]){
        this.#scope = scope
    }


    /** The component with the focus, none when nothing has it. */
    public get focused(): Component|null { return this.#focused }

    /**
     * Give the focus to a component, or to nothing, telling both, and scroll the viewports around the new
     * one so it shows. Giving it to the one that has it does nothing.
     */
    public set(component: Component|null): void {
        const old = this.#focused
        if(component === old) return
        this.#focused = component
        if(old) internals.focusChanged(old)
        if(component){
            internals.focusChanged(component)
            Focus.#reveal(component)
        }
    }

    /**
     * Move the focus by a direction, through the containers navigating along its axis.
     *
     * @returns Whether the focus moved, so the action is consumed.
     */
    public navigate(action: UiAction): boolean {
        const axis = DIRECTION_AXES[action]
        const focused = this.#focused
        if(!axis || !focused) return false
        const step = action === "up" || action === "left" ? -1 : 1
        let child: Component = focused
        for(let parent = child.parent; parent; child = parent, parent = parent.parent){
            if(internals.navigationAxisOf(parent) !== axis) continue
            const siblings = parent.children
            const start = siblings.indexOf(child) + step
            for(let index = start; index >= 0 && index < siblings.length; index += step){
                const target = Focus.#firstIn(siblings[index])
                if(!target) continue
                this.set(target)
                return true
            }
        }
        return false
    }

    /**
     * Move the focus to the next focusable component of the scope in the order of the tree, or to the
     * previous one, wrapping around. The first or the last one when nothing has the focus.
     *
     * @returns Whether the focus moved.
     */
    public cycle(forward: boolean): boolean {
        const all = this.#focusables()
        if(all.length === 0) return false
        const index = this.#focused ? all.indexOf(this.#focused) : -1
        const next = index < 0
            ? (forward ? 0 : all.length - 1)
            : (index + (forward ? 1 : all.length - 1)) % all.length
        if(all[next] === this.#focused) return false
        this.set(all[next])
        return true
    }

    /** Give the focus to the first focusable component of the scope, when there is one. */
    public focusFirst(): boolean {
        const first = this.#focusables()[0]
        if(!first) return false
        this.set(first)
        return true
    }

    /**
     * Hear that a component is about to be hidden or removed. When the focus is inside it, it moves to the
     * nearest focusable component in the order of the tree, after it first, so a gamepad always has
     * something to drive.
     */
    public noteLeaving(component: Component): void {
        const focused = this.#focused
        if(!focused || !isInside(focused, component)) return
        const all = this.#focusables()
        const index = all.indexOf(focused)
        const staying = (candidate: Component) => !isInside(candidate, component)
        const after = all.slice(index + 1).find(staying)
        const before = all.slice(0, Math.max(0, index)).reverse().find(staying)
        this.set(after ?? before ?? null)
    }

    /** Drop the focus when it lies outside the scope, as when a modal layer opens over it. */
    public keepInScope(): void {
        const focused = this.#focused
        if(!focused) return
        const inScope = this.#scope().some(root => isInside(focused, root))
        if(!inScope) this.set(null)
    }


    /** The zone to bring into view, in the coordinates of the container being revealed in. */
    static readonly #revealed = new Rect()

    /** Scroll every viewport around a component so it shows, from the innermost one out. */
    static #reveal(component: Component): void {
        const rect = Focus.#revealed.copyFrom(component.bounds)
        let child = component
        for(let parent = child.parent; parent; child = parent, parent = parent.parent){
            internals.reveal(parent, rect)
            const { x, y } = parent.bounds
            rect.translate(x - internals.scrollXOf(parent), y - internals.scrollYOf(parent))
        }
    }

    /** The first focusable component shown in a subtree, in the order of the tree, none when none is. */
    static #firstIn(component: Component): Component|null {
        if(!component.visible) return null
        if(internals.isFocusable(component)) return component
        if(!(component instanceof Container)) return null
        for(const child of component.children){
            const found = Focus.#firstIn(child)
            if(found) return found
        }
        return null
    }

    /** Every focusable component shown in a subtree, in the order of the tree, added to a list. */
    static #collect(component: Component, out: Component[]): void {
        if(!component.visible) return
        if(internals.isFocusable(component)) out.push(component)
        if(component instanceof Container) for(const child of component.children) Focus.#collect(child, out)
    }


    readonly #scope: () => readonly Component[]
    #focused: Component|null = null

    #focusables(): Component[] {
        const all: Component[] = []
        for(const root of this.#scope()) Focus.#collect(root, all)
        return all
    }
}

/** Is a component inside another one, or that one itself? */
export function isInside(component: Component, ancestor: Component): boolean {
    for(let c: Component|null = component; c; c = c.parent) if(c === ancestor) return true
    return false
}
