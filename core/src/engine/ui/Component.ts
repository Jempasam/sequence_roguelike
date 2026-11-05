import type { Painter } from "../gpu"
import type { ClipboardPort } from "../../platform"

import type { Container } from "./Container"
import type { UiAction } from "./input/UiAction"
import type { UiEvent } from "./input/UiEvent"
import type { Pose } from "./Pose"
import { Rect } from "./Rect"
import { sizeHint } from "./SizeHint"
import type { Size, SizeHint } from "./SizeHint"

/** How many widths a component keeps the measure of: a `Box` measures its children twice at the same one. */
const MEASURE_CACHE_SIZE = 2

/**
 * What the components of a tree reach of the root they are drawn by. Only `UiRoot` implements it, so the
 * root keeps these calls off its public face.
 */
export interface ComponentHost {
    /** The component with the focus, none when nothing has it. */
    readonly focused: Component|null

    /** The component under the pointer, none when the pointer is over nothing interactive. */
    readonly hovered: Component|null

    /** Is the focus indicator shown, since the device used last is the keyboard or a gamepad? */
    readonly focusVisible: boolean

    /** The clipboard of the platform, none when it has none. */
    readonly clipboard: ClipboardPort|null

    /** Where the pointer is, in virtual pixels of the texture. */
    readonly pointerX: number
    readonly pointerY: number

    /** Take a component to draw again, its zone computed at the next render. */
    noteDirty(component: Component): void

    /** Take a component to lay out again at the next render, with the bounds it has. */
    noteLayout(component: Component): void

    /** Take a zone to draw again, in coordinates of the texture. */
    addArea(rect: Readonly<Rect>): void

    /** Hear that a component is about to be hidden or removed, with everything inside it. */
    noteLeaving(component: Component): void

    /** Give the focus to a component, or to nothing. */
    focus(component: Component|null): void

    setTicking(component: Component, ticking: boolean): void
}

/**
 * The parts of components and containers the classes of `engine/ui` reach across one another. Filled by
 * the static blocks of {@link Component} and {@link Container}, and kept out of the barrel, so the game
 * sees none of it.
 */
export interface Internals {
    boundsOf(component: Component): Rect
    setParent(component: Component, parent: Container<unknown>|null): void
    setLayerHost(component: Component, host: ComponentHost|null): void
    hostOf(component: Component): ComponentHost|null
    shownHostOf(component: Component): ComponentHost|null
    toAbsolute(component: Component, area: Rect): boolean
    place(component: Component, rect: Readonly<Rect>): void
    markLayout(component: Component): void
    isLayoutDirty(component: Component): boolean
    arrange(component: Component): void
    isDirty(component: Component): boolean
    clearDirty(component: Component): void
    isSqueezed(component: Component): boolean
    absoluteArea(component: Component, out: Rect): boolean
    localPoint(component: Component, x: number, y: number, out: { x: number, y: number }): boolean
    isPosed(component: Component): boolean
    opaqueArea(component: Component): Readonly<Rect>|null
    paint(component: Component, painter: Painter, clip: Readonly<Rect>): void
    handle(component: Component, event: UiEvent): void
    isInteractive(component: Component): boolean
    isFocusable(component: Component): boolean
    isModal(component: Component): boolean
    focusChanged(component: Component): void
    hoverChanged(component: Component): void
    pressedOutside(component: Component): void
    tick(component: Component, dt: number): void
    stopTicking(component: Component): void

    scrollXOf(container: Container<unknown>): number
    scrollYOf(container: Container<unknown>): number
    viewportOf(container: Container<unknown>): Readonly<Rect>|null
    poseOf(container: Container<unknown>): Pose|null
    holdsPointer(container: Container<unknown>): boolean
    navigationAxisOf(container: Container<unknown>): NavigationAxis|null
    reveal(container: Container<unknown>, rect: Readonly<Rect>): void
}

/** The axis a container navigates its children along with the direction actions. */
export type NavigationAxis = "vertical"|"horizontal"

/** The direction actions, and the axis each moves along. */
export const DIRECTION_AXES: Readonly<Partial<Record<UiAction, NavigationAxis>>> = {
    up: "vertical", down: "vertical", left: "horizontal", right: "horizontal",
}

/** The internal parts, assigned by the static blocks of the classes that own them. */
export const internals = {} as Internals

/**
 * A node of the interface: where its parent placed it, the sizes it asks for, how it draws, and what it
 * does with the input.
 *
 * @remarks
 * One base class on purpose: the plumbing of the tree (parent, bounds, flags, caches, invalidation) is the
 * same for every component, and rewriting it in each would be the first source of bugs. A component only
 * says how it measures (`computeHint`), draws (`paint`) and lays its content out (`arranged`).
 *
 * Every visible property of a widget is a setter that compares the new value with the old one, then
 * invalidates the drawing or the layout. The game can assign everything every frame at no cost: that rule
 * keeps the interface in step with the state of the game.
 *
 * Nothing happens at once. Invalidating marks, and the root deals with everything once per frame, so ten
 * labels changed make one layout pass and a few zones drawn again.
 */
export abstract class Component {


    /** The container laying it out, none for the content of a layer and before it is added. */
    public get parent(): Container<unknown>|null { return this.#parent }

    /** Where its parent placed it, in virtual pixels, relative to the parent. */
    public get bounds(): Readonly<Rect> { return this.#bounds }

    /** Is it laid out, drawn and hit? A hidden component takes no space, and loses the focus. */
    public get visible(): boolean { return this.#visible }

    public set visible(visible: boolean){
        if(visible === this.#visible) return
        if(!visible) this.#leave()
        this.#visible = visible
        if(visible) this.invalidate()
        if(this.#parent) this.#parent.#markLayout(true)
        else this.#layerHost?.noteLayout(this)
    }

    /**
     * The size it always asks for, none to measure its content. A component of a fixed size is a layout
     * boundary: what changes inside it never lays out what lies around.
     */
    public get fixedSize(): Size|null { return this.#fixedSize }

    public set fixedSize(size: Size|null){
        const same = size?.width === this.#fixedSize?.width && size?.height === this.#fixedSize?.height
        if(same) return
        this.#fixedSize = size
        this.invalidateLayout()
    }

    /** Does it have the focus? */
    public get focused(): boolean { return this.#hostIfShown()?.focused === this }

    /** Is it the component under the pointer? */
    public get hovered(): boolean { return this.#hostIfShown()?.hovered === this }

    /**
     * The sizes it asks for when given at most a width, cached until its layout is invalidated.
     *
     * @param maxWidth - The widest it may be, in virtual pixels, `Infinity` when nothing constrains it.
     */
    public measure(maxWidth: number): SizeHint {
        const fixed = this.#fixedSize
        if(fixed) return sizeHint(fixed.width, fixed.height)
        const index = this.#cachedWidths.indexOf(maxWidth)
        if(index >= 0) return this.#cachedHints[index]
        const hint = this.computeHint(maxWidth)
        if(this.#cachedWidths.length === MEASURE_CACHE_SIZE){
            this.#cachedWidths.shift()
            this.#cachedHints.shift()
        }
        this.#cachedWidths.push(maxWidth)
        this.#cachedHints.push(hint)
        return hint
    }

    /**
     * Where it lies on its layer, in virtual pixels.
     *
     * @returns Is it shown, so the area was set?
     */
    public areaOnLayer(out: Rect): boolean {
        return internals.absoluteArea(this, out)
    }

    /** Ask for its area to be drawn again at the next frame. Asking twice changes nothing. */
    public invalidate(): void {
        if(this.#dirty) return
        const host = this.#hostIfShown()
        if(!host) return
        this.#dirty = true
        host.noteDirty(this)
    }

    /**
     * Ask for it to be measured and laid out again at the next frame, and the containers whose size
     * depends on it, up to a layout boundary.
     */
    public invalidateLayout(): void {
        this.invalidate()
        this.#markLayout(false)
    }

    /**
     * Give it the focus.
     *
     * @throws {@link Error} When it cannot take the focus, or is not shown in an interface.
     */
    public focus(): void {
        const host = this.#hostIfShown()
        if(!host) throw new Error("A component took the focus while not shown in an interface. Add it first.")
        if(!this.focusable) throw new Error("A component that is not focusable took the focus.")
        host.focus(this)
    }


    /** The sizes it asks for, computed when the cache is empty. */
    protected abstract computeHint(maxWidth: number): SizeHint

    /**
     * Draw its own content (background, border, text), before its children, the painter at its origin,
     * the clip in its own coordinates. The children are drawn by `UiRoot`, not by this method.
     */
    protected abstract paint(painter: Painter, clip: Readonly<Rect>): void

    /**
     * The part of its bounds it covers with opaque pixels, whatever lies below, in its own coordinates.
     * None by default. Claiming a zone it does not fully cover leaves stale pixels on screen.
     */
    protected opaqueRect(): Readonly<Rect>|null {
        return null
    }

    /** Lay its own content out once its bounds are known. Does nothing by default. */
    protected arranged(): void {}

    /**
     * Does its size stay the same whatever its children ask for? Then a change inside it stops climbing
     * here, and only it is laid out again. True for a component of a fixed size.
     */
    protected get isLayoutBoundary(): boolean {
        return this.#fixedSize !== null
    }

    /** Is it hit by the pointer, which it then consumes over its bounds? False by default. */
    protected get interactive(): boolean {
        return false
    }

    /** Can it take the focus? False by default. */
    protected get focusable(): boolean {
        return false
    }

    /**
     * Does it hold the input while shown: the pointer stops at its layer, and the focus stays in it?
     * False by default.
     */
    protected get modal(): boolean {
        return false
    }

    /** Is the focus indicator to be drawn on it: it has the focus, and the keyboard or a gamepad is used? */
    protected get showsFocus(): boolean {
        const host = this.#hostIfShown()
        return host !== null && host.focused === this && host.focusVisible
    }

    /** The clipboard of the platform, none when it has none or the component is not shown. */
    protected get clipboard(): ClipboardPort|null {
        return this.#hostIfShown()?.clipboard ?? null
    }

    /**
     * Does it receive a {@link Component.tick} every frame? Only a shown component can start, and one that
     * leaves the screen stops.
     */
    protected get ticking(): boolean { return this.#ticking }

    protected set ticking(ticking: boolean){
        if(ticking === this.#ticking) return
        const host = this.#hostIfShown()
        if(ticking && !host) return
        this.#ticking = ticking
        host?.setTicking(this, ticking)
    }

    /**
     * Take an event: of the pointer when over it or holding the capture, of the keyboard and the actions
     * when it has the focus, and those its children left unconsumed. Does nothing by default.
     */
    protected handle(event: UiEvent): void {
        void event
    }

    /** Hear that it took or lost the focus, read in {@link Component.focused}. Does nothing by default. */
    protected focusChanged(): void {}

    /** Hear that the pointer came over it or left, read in {@link Component.hovered}. Nothing by default. */
    protected hoverChanged(): void {}

    /** Hear, while modal, of a press outside every component of its layer. Does nothing by default. */
    protected pressedOutside(): void {}

    /**
     * Advance its animation, every frame while it is ticking.
     *
     * @param dt - The time since the frame before, in seconds.
     */
    protected tick(dt: number): void {
        void dt
    }

    /** Ask for a zone of it to be drawn again, in its own coordinates, rather than all of it. */
    protected invalidateArea(rect: Readonly<Rect>): void {
        const host = this.#hostIfShown()
        if(!host) return
        const area = Component.#scratch.copyFrom(rect).intersect(Component.#ownRect(this))
        if(!this.#toAbsolute(area)) return
        host.addArea(area)
    }


    static {
        internals.boundsOf = component => component.#bounds
        internals.setParent = (component, parent) => {
            if(!parent) component.#detach()
            component.#parent = parent
        }
        internals.setLayerHost = (component, host) => {
            if(!host) component.#detach()
            component.#layerHost = host
        }
        internals.hostOf = component => component.#host()
        internals.shownHostOf = component => component.#hostIfShown()
        internals.toAbsolute = (component, area) => component.#toAbsolute(area)
        internals.place = (component, rect) => component.#place(rect)
        internals.markLayout = component => component.#markLayout(false)
        internals.isLayoutDirty = component => component.#layoutDirty
        internals.arrange = component => {
            component.#layoutDirty = false
            component.arranged()
        }
        internals.isDirty = component => component.#dirty
        internals.clearDirty = component => {
            component.#dirty = false
        }
        internals.isSqueezed = component => component.#squeezed
        internals.absoluteArea = (component, out) => {
            if(!component.#visible) return false
            out.copyFrom(component.#bounds)
            return component.#toAbsoluteFromParent(out)
        }
        internals.opaqueArea = component => component.opaqueRect()
        internals.paint = (component, painter, clip) => component.paint(painter, clip)
        internals.handle = (component, event) => component.handle(event)
        internals.isInteractive = component => component.interactive
        internals.isFocusable = component => component.focusable
        internals.isModal = component => component.modal
        internals.focusChanged = component => component.focusChanged()
        internals.hoverChanged = component => component.hoverChanged()
        internals.pressedOutside = component => component.pressedOutside()
        internals.tick = (component, dt) => component.tick(dt)
        internals.stopTicking = component => {
            component.#ticking = false
        }
    }

    /** A rectangle to compute in, so the passes allocate nothing. */
    static readonly #scratch = new Rect()

    /** The rectangle of a component in its own coordinates, written in a shared rectangle. */
    static #ownRect(component: Component): Rect {
        return Component.#own.set(0, 0, component.#bounds.width, component.#bounds.height)
    }

    static readonly #own = new Rect()

    /** The top of the tree a component is in. */
    static #topOf(component: Component): Component {
        let top = component
        while(top.#parent) top = top.#parent
        return top
    }


    #parent: Container<unknown>|null = null

    /** The root it is drawn by, set on the content of a layer only. */
    #layerHost: ComponentHost|null = null

    readonly #bounds = new Rect()
    #visible = true
    #fixedSize: Size|null = null

    /** Is it marked to draw again? Cleared by the root at its next render. */
    #dirty = false

    /** Is it marked to lay out again? Cleared when its parent places it, or the root arranges it. */
    #layoutDirty = true

    /** Did it receive less than its minimum size, so its parent cuts what it draws to its bounds? */
    #squeezed = false

    #ticking = false
    readonly #cachedWidths: number[] = []
    readonly #cachedHints: SizeHint[] = []

    /** The root it is drawn by, none when it is not in an interface. */
    #host(): ComponentHost|null {
        return Component.#topOf(this).#layerHost
    }

    /** The root it is drawn by, none when it or one of its containers is hidden, or it is not in one. */
    #hostIfShown(): ComponentHost|null {
        if(!this.#visible) return null
        let top = this.#parent
        if(!top) return this.#layerHost
        for(;;){
            if(!top.#visible) return null
            if(!top.#parent) return top.#layerHost
            top = top.#parent
        }
    }

    /** Mark it for layout, and climb to the containers whose size depends on it. */
    #markLayout(fromChild: boolean): void {
        this.#cachedWidths.length = 0
        this.#cachedHints.length = 0
        this.#layoutDirty = true
        if(fromChild && this.isLayoutBoundary){
            this.#host()?.noteLayout(this)
            return
        }
        if(this.#parent) this.#parent.#markLayout(true)
        else this.#layerHost?.noteLayout(this)
    }

    /**
     * Take bounds from its parent: the old zone and the new one are drawn again when they differ, then it
     * lays its content out. Bounds unchanged and nothing marked, it goes no deeper.
     */
    #place(rect: Readonly<Rect>): void {
        const isWhole = [rect.x, rect.y, rect.width, rect.height].every(Number.isInteger)
        if(!isWhole){
            throw new Error(`A component was placed at (${rect.x}, ${rect.y}) sized ${rect.width}×${rect.height}:`
                + " the interface lays out whole pixels only, as a sprite between two pixels blurs.")
        }
        const bounds = this.#bounds
        const moved = !bounds.equals(rect)
        if(!moved && !this.#layoutDirty) return
        if(moved){
            const host = this.#hostIfShown()
            const old = Component.#scratch
            if(host && !bounds.isEmpty && internals.absoluteArea(this, old)) host.addArea(old)
            bounds.copyFrom(rect)
            this.invalidate()
        }
        const hint = this.measure(rect.width)
        this.#squeezed = rect.width < hint.minWidth || rect.height < hint.minHeight
        this.#layoutDirty = false
        this.arranged()
    }

    /** Draw its zone again and drop the focus, the hover and the ticks it holds, as it leaves the screen. */
    #leave(): void {
        const host = this.#hostIfShown()
        if(!host) return
        host.noteLeaving(this)
        const area = Component.#scratch
        if(internals.absoluteArea(this, area)) host.addArea(area)
    }

    /**
     * Leave the tree it is in. Its bounds are forgotten, so wherever it is placed next, even where it was,
     * it is drawn again.
     */
    #detach(): void {
        this.#leave()
        this.#bounds.set(0, 0, 0, 0)
        this.#layoutDirty = true
    }

    /**
     * Turn a zone in its own coordinates into one of the texture, cut by the viewports and squeezed
     * containers around it. False when it is not shown.
     */
    #toAbsolute(area: Rect): boolean {
        if(!this.#visible) return false
        area.translate(this.#bounds.x, this.#bounds.y)
        return this.#toAbsoluteFromParent(area)
    }

    /** Turn a zone in the coordinates of its parent into one of the texture. */
    #toAbsoluteFromParent(area: Rect): boolean {
        if(this.#squeezed) area.intersect(this.#bounds)
        for(let parent = this.#parent; parent; parent = parent.#parent){
            if(!parent.#visible) return false
            area.translate(-internals.scrollXOf(parent), -internals.scrollYOf(parent))
            const viewport = internals.viewportOf(parent)
            if(viewport) area.intersect(viewport)
            // Posed children may be drawn anywhere in the bounds of the container posing them.
            if(internals.poseOf(parent)) area.set(0, 0, parent.#bounds.width, parent.#bounds.height)
            area.translate(parent.#bounds.x, parent.#bounds.y)
            if(parent.#squeezed) area.intersect(parent.#bounds)
        }
        return this.#host() !== null && !area.isEmpty
    }
}
