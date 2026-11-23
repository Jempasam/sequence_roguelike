import { Rect } from "../../../../engine/ui"
import type { Component } from "../../../../engine/ui"
import { Scope, signal } from "../../../../lifetime"
import type { Removable } from "../../../../lifetime"
import type { Text } from "../../../../semantic"

/** What a detail says: a text, or a function making it, so a text costly to build is made when shown. */
export type DetailText = Text|(() => Text)

/** What a detail says of a point of what it is anchored to: a text, and the thing the text is about. */
export interface DetailLook {
    /** What it says. The same object for the same thing: a new one each time would be told again. */
    readonly text: Text

    /**
     * Where the thing it is about lies on the layer, in virtual pixels, such as a card held by a card. The
     * area of the component it is anchored to when none. It is copied: a rectangle kept and changed is fine.
     */
    readonly area?: Readonly<Rect>
}

/** What a detail shows: a text, what it is about, and the point of the layer the pointer was at. */
export interface DetailShown {
    readonly text: Text

    /** Where what the text is about lies on the layer, in virtual pixels. */
    readonly area: Readonly<Rect>

    /** Where the pointer was, in virtual pixels of the layer, when it was shown. */
    readonly point: { readonly x: number, readonly y: number }
}

/** Who hears what a detail shows. */
export interface DetailListener {
    /**
     * Hear what is shown now. Heard again when its text or its area changes, with no hiding between, but not
     * when the pointer only moves.
     */
    onShow(shown: DetailShown): void

    /** Hear that nothing is shown. */
    onHide(): void
}

/**
 * What a part of the interface tells about itself while the pointer is over it: a text, shown to whoever
 * listens with what it is about, and hidden when the pointer leaves.
 *
 * @remarks
 * Details make a tree. What the tree tells about a point is what its deepest detail covering the point says:
 * a detail asks its children first, the last of them above the others, then says its own if the component it
 * is anchored to holds the point. A detail with no anchor, as the one of {@link Detail.all}, has no text of
 * its own: it only answers for its children.
 *
 * What it is about is the area of the component it is anchored to, unless it says another, as a detail of
 * {@link Detail.under} does for a part of the component.
 *
 * The hover only tells when to look again: the pointer entering or leaving what a detail is anchored to, or
 * moving over it, which is what a container holding the pointer hears of the parts it holds, since it hides
 * them from the hover. What is shown is told again when it changes, with no hiding between: a listener takes
 * `onShow` for "what is shown is now this".
 *
 * It listens until it is removed, which a screen does when it builds its interface again.
 */
export class Detail implements Removable {


    /**
     * What tells about a component while the pointer is over it or what it holds.
     *
     * @param children - The details of what it holds, which come first, the last of them above the others.
     */
    public static on(node: Component, own: DetailText|null, children: readonly Detail[] = []): Detail {
        return new Detail(node, own, children)
    }

    /**
     * What tells about a component with a text that depends on the point of it the pointer is at, such as a
     * map or a card holding cards: the places and the cards held are no components.
     *
     * @param anchor - The component the text is told about, whose area is the zone of the detail.
     * @param lookAt - What it says at a point of the layers, in virtual pixels, and what that is about: none
     *   when it says nothing there. Asked at each move.
     */
    public static under(
        anchor: Component, lookAt: (x: number, y: number) => DetailLook|null,
    ): Detail {
        return new Detail(anchor, null, [], lookAt)
    }

    /** What tells what one of its details tells, the last one first: it has nothing to say itself. */
    public static all(...details: readonly Detail[]): Detail {
        return new Detail(null, null, details)
    }

    /** What tells nothing, for a place with nothing to tell. */
    public static none(): Detail {
        return new Detail(null, null, [])
    }


    private constructor(
        private readonly anchor: Component|null,
        own: DetailText|null,
        private readonly children: readonly Detail[],
        private readonly looked: ((x: number, y: number) => DetailLook|null)|null = null,
    ){
        this.#own = own
        for(const child of children) child.#parent = this
        this.#scope.track(...this.#watch(() => this.#settle(false)))
        this.#settle(false)
    }


    /** What it shows now, none when it shows nothing. */
    public get shown(): DetailShown|null { return this.#shown }

    /** Does it tell? A detail that does not, and the details it holds, show nothing. It does by default. */
    public get enabled(): boolean { return this.#enabled }

    public set enabled(enabled: boolean){
        if(enabled === this.#enabled) return
        this.#enabled = enabled
        this.#settle(false)
        for(let parent = this.#parent; parent; parent = parent.#parent) parent.#settle(false)
    }

    /** Hear what it shows, until the handle returned is removed. */
    public listen(listener: DetailListener): Removable {
        return this.#events.add(shown => {
            if(shown === null) listener.onHide()
            else listener.onShow(shown)
        })
    }

    /**
     * Change what it says of itself. When it is what is shown, it is told again.
     *
     * @param own - The new text, none to say nothing.
     */
    public set(own: DetailText|null): void {
        const showsOwn = this.#shown !== null && !this.children.some(child => child.#answers())
        this.#own = own
        this.#made = null
        this.#settle(showsOwn)
    }

    /**
     * What it tells about a point of the layers, in virtual pixels, as if the pointer were there: what the
     * deepest of its details covering the point says, none when none does. It does not look at where the
     * pointer is, which is what decides what is shown.
     */
    public at(x: number, y: number): DetailShown|null {
        if(!this.#enabled) return null
        for(let index = this.children.length - 1; index >= 0; index--){
            const shown = this.children[index].at(x, y)
            if(shown !== null) return shown
        }
        const anchor = this.anchor
        if(!anchor || !anchor.containsAbsolute(x, y)) return null
        const look = this.looked ? this.looked(x, y) : this.#ownLook()
        if(look === null) return null
        const area = new Rect()
        if(look.area) area.copyFrom(look.area)
        else if(!anchor.areaOnLayer(area)) area.set(0, 0, 0, 0)
        return { text: look.text, area, point: { x, y } }
    }

    /** Stop listening to the hover, and to its children: nothing is told after it. */
    public remove(): void {
        this.#scope.remove()
        this.#events.clear()
        this.#shown = null
    }


    #own: DetailText|null
    #shown: DetailShown|null = null
    #enabled = true

    /** The detail that holds it, none when none does: it tells what it shows when it is enabled or not. */
    #parent: Detail|null = null

    /** The text made from a function, kept while it is shown so it is not made again at each change. */
    #made: Text|null = null

    readonly #events = signal<DetailShown|null>()
    readonly #scope = new Scope()

    /** What it says of itself, none when it has nothing to say. */
    #ownLook(): DetailLook|null {
        const own = this.#own
        if(own === null) return null
        if(typeof own !== "function") return { text: own }
        return { text: this.#made ??= own() }
    }

    /** Is the pointer over what this detail or one of its children is anchored to? */
    #over(): boolean {
        return this.anchor ? this.anchor.hoveredWithin : this.children.some(child => child.#over())
    }

    /** The component to read the pointer from: its own, or the first of its children that has one. */
    #pointerSource(): Component|null {
        if(this.anchor) return this.anchor
        for(const child of this.children){
            const source = child.#pointerSource()
            if(source) return source
        }
        return null
    }

    /** Does it, or one of its children, tell something at the pointer? */
    #answers(): boolean {
        return this.#look() !== null
    }

    /** What the tree under it tells at the pointer, none when the pointer is not over it. */
    #look(): DetailShown|null {
        if(!this.#over()) return null
        const source = this.#pointerSource()
        return source ? this.at(source.pointerX, source.pointerY) : null
    }

    /** Hear the pointer come, go and move where this detail and its children are anchored. */
    #watch(look: () => void): Removable[] {
        const watched: Removable[] = []
        if(this.anchor){
            watched.push(this.anchor.listenHoverWithin(look), this.anchor.listenPointerMove(look))
        }
        for(const child of this.children) watched.push(...child.#watch(look))
        return watched
    }

    /** Forget the texts made, here and in its children, so they are made again when next shown. */
    #forget(): void {
        this.#made = null
        for(const child of this.children) child.#forget()
    }

    /**
     * Tell what it shows if it changed.
     *
     * @param again - Tell it even if it did not, since it is the text of this very detail that changed.
     */
    #settle(again: boolean): void {
        if(this.#scope.isRemoved) return
        const shown = this.#look()
        if(shown === null){
            this.#forget()
            if(this.#shown === null) return
            this.#shown = null
            this.#events.notify(null)
            return
        }
        const before = this.#shown
        if(before && shown.text === before.text && shown.area.equals(before.area) && !again) return
        this.#shown = shown
        this.#events.notify(shown)
    }
}
