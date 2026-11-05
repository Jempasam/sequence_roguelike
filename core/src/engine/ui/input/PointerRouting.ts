import type { InputEvent } from "../../input"

import { internals } from "../Component"
import type { Component } from "../Component"
import { Container } from "../Container"
import type { Layer } from "../Layer"
import { unposed } from "../Pose"
import type { Focus } from "./Focus"
import { isInside } from "./Focus"
import type { RoutedEvent } from "./UiEvent"

/**
 * Where the pointer is, what it is over, and who holds it.
 *
 * @remarks
 * The hit test runs from the top layer down, and in each container from the last child to the first, the
 * reverse of the drawing order. Only the visible and interactive components are hit. A modal layer stops
 * it: nothing below takes the pointer.
 *
 * A press captures the pointer for the component hit, until its release: that is what keeps the drag of a
 * slider or a scroll bar going when the pointer leaves it. An event over an interactive component is
 * consumed even when nothing handles it, so a click on the HUD never reaches the world, while the empty
 * zones of a stack over the whole screen consume nothing.
 */
export class PointerRouting {


    constructor(layers: () => readonly Layer[], focus: Focus){
        this.#layers = layers
        this.#focus = focus
    }


    /** The interactive component under the pointer, none when it is over nothing interactive. */
    public get hovered(): Component|null { return this.#hovered }

    /** The component holding the pointer since a press, none when no button is held over the interface. */
    public get captured(): Component|null { return this.#captured }

    /** The position of the pointer, in virtual pixels of the texture. */
    public get x(): number { return this.#x }
    public get y(): number { return this.#y }

    /** Find again what the pointer is over, since the interface may have moved under it. */
    public refresh(): void {
        this.#hitTest()
        this.#setHovered(this.#hit)
    }

    /**
     * Route an event of the pointer of the input frame, and consume it when it lands on the interface.
     *
     * @param x - The position of the pointer, in virtual pixels of the texture.
     */
    public route(event: InputEvent, x: number, y: number, routed: RoutedEvent): void {
        this.#x = x
        this.#y = y
        this.#hitTest()
        const hit = this.#hit
        const blocking = this.#blocking
        this.#setHovered(hit)
        const holder = this.#captured
        switch(event.type){
            case "pointer-move":
                this.#send(holder ?? hit, routed.reset("pointer-move", null), -1)
                break
            case "pointer-down":
                if(!hit && blocking){
                    for(const child of [...blocking.content.children]){
                        if(child.visible && internals.isModal(child)) internals.pressedOutside(child)
                    }
                    break
                }
                if(!holder && hit){
                    this.#captured = hit
                    this.#captureButton = event.button
                }
                this.#focus.set(hit ? nearestFocusable(hit) : null)
                this.#send(holder ?? hit, routed.reset("pointer-down", null), event.button)
                break
            case "pointer-up":
                this.#send(holder ?? hit, routed.reset("pointer-up", null), event.button)
                if(holder && event.button === this.#captureButton) this.#captured = null
                break
            case "wheel":
                routed.reset("wheel", null)
                routed.dx = event.dx
                routed.dy = event.dy
                this.#send(hit, routed, -1)
                break
            default:
                return
        }
        if(hit || holder || blocking) event.consume()
    }

    /** Hear that a component is about to be hidden or removed: it is no longer hovered nor holding. */
    public noteLeaving(component: Component): void {
        if(this.#hovered && isInside(this.#hovered, component)) this.#setHovered(null)
        if(this.#captured && isInside(this.#captured, component)) this.#captured = null
    }


    readonly #layers: () => readonly Layer[]
    readonly #focus: Focus
    #x = 0
    #y = 0
    #hovered: Component|null = null
    #captured: Component|null = null
    #captureButton = -1

    /** What the last hit test found under the pointer, and the modal layer that stopped it, if any. */
    #hit: Component|null = null
    #blocking: Layer|null = null

    /** Find the deepest interactive component under the pointer, or the modal layer stopping the search. */
    #hitTest(): void {
        const layers = this.#layers()
        this.#hit = null
        this.#blocking = null
        for(let index = layers.length - 1; index >= 0; index--){
            const layer = layers[index]
            this.#hit = hitIn(layer.content, this.#x, this.#y)
            if(this.#hit) return
            if(layer.modal){
                this.#blocking = layer
                return
            }
        }
    }

    #setHovered(component: Component|null): void {
        const old = this.#hovered
        if(component === old) return
        this.#hovered = component
        if(old) internals.hoverChanged(old)
        if(component) internals.hoverChanged(component)
    }

    /** Send an event of the pointer to a component, then to its containers until one consumes it. */
    #send(target: Component|null, routed: RoutedEvent, button: number): void {
        if(!target) return
        routed.button = button
        routed.absoluteX = this.#x
        routed.absoluteY = this.#y
        bubble(target, routed)
    }
}

/**
 * Send an event to a component, then to each of its containers until one consumes it. The position of an
 * event of the pointer is given to each in its own coordinates.
 */
export function bubble(target: Component, routed: RoutedEvent): void {
    const origin = ORIGIN
    for(let component: Component|null = target; component; component = component.parent){
        if(internals.localPoint(component, routed.absoluteX, routed.absoluteY, origin)){
            routed.x = origin.x
            routed.y = origin.y
        }
        internals.handle(component, routed)
        if(routed.consumed) return
    }
}

/** Where the pointer is for a component being sent an event, so sending allocates nothing. */
const ORIGIN = { x: 0, y: 0 }

/** A point under a pose, back where the children were placed, so hitting allocates nothing. */
const UNPOSED = { x: 0, y: 0 }

/**
 * The deepest visible and interactive component under a point, none when there is none. A container
 * holding the pointer is hit itself, whatever lies in it, and a posed one is looked into where its
 * children were placed, the point turned back.
 *
 * @param x - The point, in the coordinates of the content of the parent of the component.
 */
export function hitIn(component: Component, x: number, y: number): Component|null {
    if(!component.visible) return null
    const bounds = component.bounds
    if(!bounds.containsPoint(x, y)) return null
    const localX = x - bounds.x
    const localY = y - bounds.y
    const interactive = internals.isInteractive(component)
    if(component instanceof Container && interactive && internals.holdsPointer(component)) return component
    if(component instanceof Container){
        const viewport = internals.viewportOf(component)
        if(!viewport || viewport.containsPoint(localX, localY)){
            let contentX = localX + internals.scrollXOf(component)
            let contentY = localY + internals.scrollYOf(component)
            const pose = internals.poseOf(component)
            if(pose){
                unposed(pose, contentX, contentY, UNPOSED)
                contentX = UNPOSED.x
                contentY = UNPOSED.y
            }
            const children = component.children
            for(let index = children.length - 1; index >= 0; index--){
                const found = hitIn(children[index], contentX, contentY)
                if(found) return found
            }
        }
    }
    return interactive ? component : null
}

/** The component itself or its nearest container that takes the focus, none when none does. */
function nearestFocusable(component: Component): Component|null {
    for(let c: Component|null = component; c; c = c.parent) if(internals.isFocusable(c)) return c
    return null
}
