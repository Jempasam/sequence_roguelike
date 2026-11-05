import { Component, internals } from "./Component"
import type { NavigationAxis } from "./Component"
import { unposed } from "./Pose"
import type { Pose } from "./Pose"
import type { Rect } from "./Rect"

/**
 * A component placing children, each with the slot parameters its layout reads.
 *
 * @remarks
 * Only a container places its children, through {@link Container.place}. Code outside never sets bounds:
 * it changes the slot of a child, which the layout reads, so a position set from outside can never be
 * overwritten silently at the next layout.
 *
 * ```ts
 * box.add(label, { grow: 1, align: "center" })
 * ```
 */
export abstract class Container<Slot> extends Component {


    /** The children, in the order they are drawn. */
    public get children(): readonly Component[] { return this.#children }

    /**
     * Can two of its children overlap? False by default: a container tiling its children lets a repaint
     * skip its siblings. `Stack` says true.
     */
    public get childrenMayOverlap(): boolean {
        return false
    }

    /**
     * Add a child at the end, with its slot parameters, the defaults of the layout for those not given.
     *
     * @throws {@link Error} When the child already has a parent, or is the content of a layer.
     */
    public add(child: Component, slot?: Partial<Slot>): void {
        if(child.parent) throw new Error("A component was added to a second container. Remove it from the first.")
        if(internals.hostOf(child)) throw new Error("The content of a layer was added to a container.")
        internals.setParent(child, this)
        this.#children.push(child)
        this.#slots.set(child, { ...this.defaultSlot(), ...slot })
        internals.markLayout(this)
    }

    /**
     * Take a child out. Its zone is drawn again, and it loses the focus.
     *
     * @throws {@link Error} When it is not a child of this container.
     */
    public remove(child: Component): void {
        const index = this.#children.indexOf(child)
        if(index < 0) throw new Error("A component was removed from a container it is not in.")
        internals.setParent(child, null)
        this.#children.splice(index, 1)
        this.#slots.delete(child)
        internals.markLayout(this)
    }

    /**
     * The slot parameters of a child.
     *
     * @throws {@link Error} When it is not a child of this container.
     */
    public slotOf(child: Component): Readonly<Slot> {
        const slot = this.#slots.get(child)
        if(!slot) throw new Error("The slot of a component was read from a container it is not in.")
        return slot
    }

    /**
     * Change the slot parameters of a child, those not given kept. It lays the container out again when
     * one changes.
     *
     * @throws {@link Error} When it is not a child of this container.
     */
    public setSlot(child: Component, slot: Partial<Slot>): void {
        const current = this.slotOf(child) as Slot
        let changed = false
        for(const key in slot){
            if(slot[key] === current[key]) continue
            current[key] = slot[key] as Slot[typeof key]
            changed = true
        }
        if(changed) internals.markLayout(this)
    }


    /** The slot of a child added without one. */
    protected abstract defaultSlot(): Slot

    /**
     * Give a child its bounds, in the coordinates of this container. Its old zone and the new one are drawn
     * again when they differ, then it lays its own content out.
     *
     * @throws {@link Error} When the rectangle is not in whole pixels.
     */
    protected place(child: Component, rect: Readonly<Rect>): void {
        internals.place(child, rect)
    }

    /** How far its children are scrolled to the right, in virtual pixels. None by default. */
    protected get scrollX(): number {
        return 0
    }

    /** How far its children are scrolled down, in virtual pixels. None by default. */
    protected get scrollY(): number {
        return 0
    }

    /**
     * The zone its children are cut to, in its own coordinates, none to let them draw anywhere in its
     * bounds. A scissor is set around it, so only a container whose children overflow on purpose has one.
     */
    protected viewport(): Readonly<Rect>|null {
        return null
    }

    /**
     * How its children are drawn and hit: turned and scaled about a point of it, none to draw them as
     * placed. They are measured and placed as usual, and a zone of them to draw again is its whole bounds:
     * its bounds hold the room they take once posed. No scissor is set under a pose, which would turn with
     * it, so a viewport or a squeezed child under it is refused when drawn.
     */
    protected pose(): Pose|null {
        return null
    }

    /**
     * Does it take the pointer over its children, as one interactive whole? A child under the pointer is
     * then never hit, nor hovered, nor sent the pointer: a card offered as a choice is picked whole. No by
     * default, and only an interactive container takes it.
     */
    protected get holdsPointer(): boolean {
        return false
    }

    /** The axis it moves the focus along with the direction actions, none to let them climb. */
    protected get navigationAxis(): NavigationAxis|null {
        return null
    }

    /**
     * Bring into view a zone of its content that took the focus, in the coordinates of its children. Does
     * nothing by default: a `Scroll` scrolls to it.
     */
    protected reveal(rect: Readonly<Rect>): void {
        void rect
    }


    static {
        internals.scrollXOf = container => container.scrollX
        internals.scrollYOf = container => container.scrollY
        internals.viewportOf = container => container.viewport()
        internals.poseOf = container => container.pose()
        internals.holdsPointer = container => container.holdsPointer
        internals.localPoint = (component, x, y, out) => {
            const path = Container.#path
            path.length = 0
            for(let each: Component|null = component; each; each = each.parent) path.push(each)
            out.x = x
            out.y = y
            for(let index = path.length - 1; index >= 0; index--){
                const each = path[index]
                out.x -= each.bounds.x
                out.y -= each.bounds.y
                if(index === 0 || !(each instanceof Container)) continue
                out.x += each.scrollX
                out.y += each.scrollY
                const pose = each.pose()
                if(pose) unposed(pose, out.x, out.y, out)
            }
            const top = path[path.length - 1]
            path.length = 0
            return internals.hostOf(top) !== null
        }
        internals.isPosed = component => {
            for(let parent = component.parent; parent; parent = parent.parent) if(parent.pose()) return true
            return false
        }
        internals.navigationAxisOf = container => container.navigationAxis
        internals.reveal = (container, rect) => container.reveal(rect)
    }

    /** The components from one up to the top of its tree, so finding a point in it allocates nothing. */
    static readonly #path: Component[] = []


    readonly #children: Component[] = []
    readonly #slots = new Map<Component, Slot>()
}

/**
 * A container of one child at most, its content: a frame, a viewport, a fitting.
 */
export abstract class ContentContainer extends Container<object> {


    /** The child it holds, none when empty. Setting another one takes the former out. */
    public get content(): Component|null { return this.children[0] ?? null }

    public set content(content: Component|null){
        const current = this.content
        if(content === current) return
        if(current) this.remove(current)
        if(content) this.add(content)
    }

    /**
     * @throws {@link Error} When it already holds a child.
     */
    public override add(child: Component, slot?: object): void {
        if(this.children.length > 0) throw new Error("A container of one child was given a second one.")
        super.add(child, slot)
    }


    protected defaultSlot(): object {
        return {}
    }
}
