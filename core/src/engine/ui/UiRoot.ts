import { Painter, RenderTexture, TextureSurface } from "../gpu"
import type { Gpu, TargetSurface } from "../gpu"
import type { ActionMap, ActionOccurrence, InputFrame } from "../input"
import type { ClipboardPort } from "../../platform"

import { internals } from "./Component"
import type { Component, ComponentHost } from "./Component"
import { DirtyRegion } from "./DirtyRegion"
import { Focus } from "./input/Focus"
import { bubble, PointerRouting } from "./input/PointerRouting"
import { uiActions } from "./input/UiAction"
import type { UiAction } from "./input/UiAction"
import { RoutedEvent } from "./input/UiEvent"
import { Layer } from "./Layer"
import { Rect } from "./Rect"
import { Repaint } from "./Repaint"

/**
 * The lowest the interface texture gets by default, in virtual pixels: the scale is the largest whole
 * number keeping it at least this high, so a 1080 pixels screen draws the interface 4 times larger.
 */
export const MIN_VIRTUAL_HEIGHT = 270

/** The blend modes the interface draws with. `"multiply"` gives black on its transparent texture. */
const UI_BLENDS = ["cutout", "alpha", "additive"] as const

/** How an interface is set up beyond its GPU and screen. */
export interface UiRootOptions {
    /** The `ui` table it reads its actions from, one with the bindings by default when none. */
    readonly actions?: ActionMap<UiAction, never>

    /** The clipboard text fields copy to and paste from, none to have neither. */
    readonly clipboard?: ClipboardPort|null

    /** The scale it is drawn at, none to fit {@link MIN_VIRTUAL_HEIGHT}. */
    readonly scale?: number|null

    /**
     * Are the checks of debug on: a zone drawn again from an opaque component cleared to magenta first, and
     * a component drawing out of its bounds refused? Off by default.
     */
    readonly debug?: boolean
}

/**
 * The interface of the game: menus, HUD and debug tools, a retained tree of components in layers, drawn
 * into a texture of its own and laid on the screen every frame in one quad.
 *
 * @remarks
 * The content of the screen is undefined after `present()`, so part of it cannot be drawn again while the
 * rest is kept. The interface lives in its own transparent texture, in virtual pixels, cleared and drawn
 * again only where something changed, and laid over the world each frame. In premultiplied alpha, "over"
 * is associative, so composing in a texture then laying it equals drawing directly.
 *
 * The frame of `game` calls, in order: {@link UiRoot.handle} before the gameplay tables read the input, so a
 * click on the HUD never reaches the world; then sets the values of the widgets; then
 * {@link UiRoot.update}; then {@link UiRoot.render}, after the world. A frame where nothing changed only
 * lays the texture on the screen. Rendering presents nothing: `gpu.flush()` and `present()` stay with the
 * frame of `game`.
 *
 * Built by `game` and injected, with no singleton, so it is tested without a platform.
 */
export class UiRoot {


    /** The `ui` table its actions come from. */
    public readonly actions: ActionMap<UiAction, never>

    /** Are the checks of debug on? */
    public readonly debug: boolean

    constructor(
        /** The GPU it draws through. */
        public readonly gpu: Gpu,

        /** Where its texture is laid, the screen in practice. */
        public readonly screen: TargetSurface,

        options: UiRootOptions = {},
    ){
        this.actions = options.actions ?? uiActions()
        this.debug = options.debug ?? false
        this.#preferredScale = options.scale ?? null
        this.#clipboard = options.clipboard ?? null
        this.#scale = this.#scaleFor(screen.height)
        const width = Math.ceil(screen.width / this.#scale)
        const height = Math.ceil(screen.height / this.#scale)
        this.#texture = new RenderTexture(gpu, Math.max(1, width), Math.max(1, height))
        this.#surface = new TextureSurface(gpu, this.#texture)
        this.#painter = new Painter(gpu, this.#surface, { blends: UI_BLENDS })
        this.#repaint = new Repaint(this.#painter, this.debug)
        this.#focus = new Focus(() => this.#scope())
        this.#pointer = new PointerRouting(() => this.#layers, this.#focus)
        this.#region.resize(this.#texture.width, this.#texture.height)
    }


    //// Layers ////

    /** The layers, in the order they draw. */
    public get layers(): readonly Layer[] { return this.#layers }

    /**
     * Add a layer over the others: the game creates `main`, `popup`, then `debug`, in practice.
     *
     * @throws {@link Error} When a layer already has that name.
     */
    public addLayer(name: string): Layer {
        if(this.#layers.some(layer => layer.name === name)) throw new Error(`The interface already has a layer "${name}".`)
        const layer = new Layer(name, this.#host)
        this.#layers.push(layer)
        this.#fullRedraw = true
        return layer
    }

    /**
     * The layer of a name.
     *
     * @throws {@link Error} When it has none of that name.
     */
    public layer(name: string): Layer {
        const layer = this.#layers.find(candidate => candidate.name === name)
        if(!layer) throw new Error(`The interface has no layer "${name}". Add it with addLayer first.`)
        return layer
    }


    //// Scale and state ////

    /** How many pixels of the screen a virtual pixel takes, a whole number. */
    public get scale(): number { return this.#scale }

    /**
     * The scale the player chose, none to fit {@link MIN_VIRTUAL_HEIGHT}. Changing it draws everything
     * again at the next render.
     *
     * @throws {@link Error} When it is not a positive whole number.
     */
    public get preferredScale(): number|null { return this.#preferredScale }

    public set preferredScale(scale: number|null){
        if(scale !== null && (!Number.isInteger(scale) || scale <= 0)){
            throw new Error(`The scale of the interface is a positive whole number, not ${scale}.`)
        }
        this.#preferredScale = scale
    }

    /** The size of the texture, in virtual pixels. */
    public get width(): number { return this.#texture.width }
    public get height(): number { return this.#texture.height }

    /** The texture the interface is drawn into, replaced when the screen changes size. */
    public get texture(): RenderTexture { return this.#texture }

    /** The component with the focus, none when nothing has it. */
    public get focused(): Component|null { return this.#focus.focused }

    /** The interactive component under the pointer, none when it is over nothing interactive. */
    public get hovered(): Component|null { return this.#pointer.hovered }

    /** Is the focus indicator shown, since the device used last is the keyboard or a gamepad? */
    public get focusVisible(): boolean { return this.#focusVisible }

    /** The position of the pointer, in virtual pixels of the texture. */
    public get pointerX(): number { return this.#pointer.x }
    public get pointerY(): number { return this.#pointer.y }


    //// The frame ////

    /**
     * Read the input of a frame and consume what concerns the interface, before the gameplay tables read
     * it: the pointer over it, the keys and text for the focused component, the actions of the `ui` table.
     * It only marks the events of the frame, and allocates nothing.
     */
    public handle(frame: InputFrame): void {
        const kind = frame.lastDevice?.kind
        const focusVisible = kind === "keyboard" || kind === "gamepad"
        if(focusVisible !== this.#focusVisible){
            this.#focusVisible = focusVisible
            this.#focus.focused?.invalidate()
        }
        this.#focus.keepInScope()
        this.#pointer.refresh()
        const routed = this.#routed
        const scale = this.#scale
        for(const event of frame.events){
            if(event.consumed) continue
            switch(event.type){
                case "pointer-move":
                case "pointer-down":
                case "pointer-up":
                    this.#pointer.route(event, Math.floor(event.x / scale), Math.floor(event.y / scale),
                        routed)
                    break
                case "wheel":
                    this.#pointer.route(event, this.#pointer.x, this.#pointer.y, routed)
                    break
                case "key-down":
                case "key-up":
                case "key-repeat":
                case "text": {
                    const focused = this.#focus.focused
                    if(!focused) break
                    routed.reset(event.type, event)
                    routed.code = event.code
                    routed.text = event.text
                    this.#readModifiers(frame)
                    bubble(focused, routed)
                    break
                }
                default:
                    break
            }
        }
        // Read after the keys went to the focused component, so a key a text field took makes no action.
        this.actions.update(frame)
        for(const occurrence of this.actions.occurrences){
            if(occurrence.consumed) continue
            this.#readModifiers(frame)
            this.#routeAction(occurrence)
        }
    }

    /**
     * Advance the components that animate, and the listeners of the frame.
     *
     * @param dt - The time since the frame before, in seconds.
     */
    public update(dt: number): void {
        for(const component of this.#ticking){
            if(internals.shownHostOf(component) !== this.#host){
                this.#ticking.delete(component)
                internals.stopTicking(component)
                continue
            }
            internals.tick(component, dt)
        }
        for(const listener of [...this.#listeners]) listener(dt)
    }

    /**
     * Call a function at every update, until the returned handle is disposed: what a helper outside the
     * tree, such as a tooltip, animates through.
     */
    public onUpdate(listener: (dt: number) => void): { dispose(): void } {
        this.#listeners.add(listener)
        return { dispose: () => this.#listeners.delete(listener) }
    }

    /**
     * Lay out what was marked, draw again the zones that changed into the texture, then lay the texture on
     * the screen in one quad, scaled up.
     */
    public render(): void {
        this.#fit()
        this.#layout()
        this.#collect()
        this.#repaint.draw(this.#layers, this.#region)
        this.#region.clear()
        const painter = this.#painter
        painter.setTarget(this.screen)
        painter.push()
        painter.setBlend("alpha")
        painter.scale(this.#scale)
        painter.sprite(this.#texture.sprite, 0, 0)
        painter.pop()
        painter.setTarget(this.#surface)
    }

    /** Free the texture. Disposing twice does nothing. */
    public dispose(): void {
        this.#listeners.clear()
        this.#texture.dispose()
    }


    readonly #layers: Layer[] = []
    readonly #region = new DirtyRegion()
    readonly #painter: Painter
    readonly #repaint: Repaint
    readonly #focus: Focus
    readonly #pointer: PointerRouting
    readonly #clipboard: ClipboardPort|null
    readonly #routed = new RoutedEvent()
    readonly #ticking = new Set<Component>()
    readonly #listeners = new Set<(dt: number) => void>()
    #texture: RenderTexture
    #surface: TextureSurface
    #scale: number
    #preferredScale: number|null
    #focusVisible = false
    #fullRedraw = true

    /** The components marked to draw again since the last render. */
    readonly #dirty: Component[] = []

    /** The components marked to lay out again with the bounds they have, the contents of layers aside. */
    readonly #layoutRoots = new Set<Component>()

    readonly #area = new Rect()
    readonly #whole = new Rect()

    /** What the components reach of their root. */
    readonly #host: ComponentHost = this.#newHost()

    #newHost(): ComponentHost {
        const focused = () => this.#focus.focused
        const hovered = () => this.#pointer.hovered
        const focusVisible = () => this.#focusVisible
        const clipboard = () => this.#clipboard
        const pointer = () => this.#pointer
        return {
            get focused(){ return focused() },
            get hovered(){ return hovered() },
            get focusVisible(){ return focusVisible() },
            get clipboard(){ return clipboard() },
            get pointerX(){ return pointer().x },
            get pointerY(){ return pointer().y },
            noteDirty: component => this.#dirty.push(component),
            noteLayout: component => {
                // The content of a layer is laid out at every render anyway, over the whole texture.
                if(component.parent) this.#layoutRoots.add(component)
            },
            addArea: rect => this.#region.add(rect),
            noteLeaving: component => {
                this.#focus.noteLeaving(component)
                this.#pointer.noteLeaving(component)
            },
            focus: component => this.#focus.set(component),
            setTicking: (component, ticking) => {
                if(ticking) this.#ticking.add(component)
                else this.#ticking.delete(component)
            },
        }
    }

    /** The contents the focus may move within: the modal layer on top, or every layer. */
    #scope(): readonly Component[] {
        for(let index = this.#layers.length - 1; index >= 0; index--){
            if(this.#layers[index].modal) return [this.#layers[index].content]
        }
        return this.#layers.map(layer => layer.content)
    }

    #readModifiers(frame: InputFrame): void {
        this.#routed.shift = frame.isKeyHeld("ShiftLeft") || frame.isKeyHeld("ShiftRight")
        this.#routed.control = frame.isKeyHeld("ControlLeft") || frame.isKeyHeld("ControlRight")
            || frame.isKeyHeld("MetaLeft") || frame.isKeyHeld("MetaRight")
    }

    /**
     * Give an action to the focused component and its containers, then, unconsumed, move the focus with
     * it. With nothing focused, a move gives the focus to the first focusable component.
     */
    #routeAction(occurrence: ActionOccurrence<UiAction>): void {
        const focused = this.#focus.focused
        const routed = this.#routed
        if(focused){
            routed.reset("action", occurrence)
            routed.action = occurrence.action
            bubble(focused, routed)
            if(routed.consumed) return
        }
        const action = occurrence.action
        switch(action){
            case "up":
            case "down":
            case "left":
            case "right": {
                const moved = focused ? this.#focus.navigate(action) : this.#focus.focusFirst()
                if(moved) occurrence.consume()
                break
            }
            case "next":
            case "previous":
                if(this.#focus.cycle(action === "next")) occurrence.consume()
                break
            default:
                break
        }
    }


    //// Rendering ////

    /** The scale for a screen height: the one chosen, or the largest keeping {@link MIN_VIRTUAL_HEIGHT}. */
    #scaleFor(screenHeight: number): number {
        return this.#preferredScale ?? Math.max(1, Math.floor(screenHeight / MIN_VIRTUAL_HEIGHT))
    }

    /**
     * Follow the size of the screen and the scale: the texture is replaced by one of the new size, since a
     * texture only grows and everything is drawn again anyway.
     */
    #fit(): void {
        const scale = this.#scaleFor(this.screen.height)
        const width = Math.max(1, Math.ceil(this.screen.width / scale))
        const height = Math.max(1, Math.ceil(this.screen.height / scale))
        const isSame = scale === this.#scale
            && width === this.#texture.width && height === this.#texture.height
        if(isSame) return
        this.#scale = scale
        this.#texture.dispose()
        this.#texture = new RenderTexture(this.gpu, width, height)
        // The camera of a surface is fitted to its texture once, so a new one follows the new size.
        this.#surface = new TextureSurface(this.gpu, this.#texture)
        this.#painter.setTarget(this.#surface)
        this.#region.resize(width, height)
        this.#fullRedraw = true
    }

    /** Lay out the contents of the layers over the whole texture, then the boundaries marked inside them. */
    #layout(): void {
        const whole = this.#whole.set(0, 0, this.#texture.width, this.#texture.height)
        for(const layer of this.#layers){
            if(this.#fullRedraw) internals.markLayout(layer.content)
            internals.place(layer.content, whole)
        }
        // Outer ones first: laying one out may lay out those inside it.
        const roots = [...this.#layoutRoots].sort((a, b) => depthOf(a) - depthOf(b))
        this.#layoutRoots.clear()
        for(const root of roots){
            const isAttached = internals.shownHostOf(root) === this.#host
            if(isAttached && internals.isLayoutDirty(root)) internals.arrange(root)
        }
    }

    /**
     * Turn the components marked into zones of the texture. One inside a marked container is skipped, its
     * zone being in the one of the container, and so is one hidden by an opaque component drawn after it.
     */
    #collect(): void {
        const dirty = this.#dirty
        if(this.#fullRedraw){
            this.#region.clear()
            this.#region.addAll()
            this.#fullRedraw = false
        } else {
            const area = this.#area
            for(const component of dirty){
                if(internals.shownHostOf(component) !== this.#host || hasDirtyContainer(component)) continue
                if(!internals.absoluteArea(component, area)) continue
                if(this.#repaint.isHidden(component, area, this.#layers)) continue
                this.#region.add(area)
            }
        }
        for(const component of dirty) internals.clearDirty(component)
        dirty.length = 0
    }
}

/** How many containers a component lies in. */
function depthOf(component: Component): number {
    let depth = 0
    for(let c = component.parent; c; c = c.parent) depth++
    return depth
}

/** Is one of the containers of a component marked to draw again? */
function hasDirtyContainer(component: Component): boolean {
    for(let c = component.parent; c; c = c.parent) if(internals.isDirty(c)) return true
    return false
}
