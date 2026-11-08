import { internals } from "../Component"
import type { Component } from "../Component"
import { Container } from "../Container"
import type { UiEvent } from "../input/UiEvent"
import { Rect } from "../Rect"
import { WHEEL_STEP } from "./Scroll"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"

/** How fast a child moves to where it goes, as the share of the way left it goes each second. */
const SLIDE_RATE = 18

/** How much of each child stays in sight by default while another shows whole, in virtual pixels. */
const DEFAULT_STRIP = 10

/** How close to where it goes a child is put there at once, in virtual pixels. */
const SLIDE_SNAP = 0.5

/** How an overflow container is set up. */
export interface OverflowContainerOptions {
    /** The space between two children when none overflows, in virtual pixels, none by default. */
    readonly gap?: number

    /**
     * How far each child overflows the next one at least, in virtual pixels, 0 by default: the children
     * side by side with their gap. It is the same for every pair, whatever their widths.
     */
    readonly minOverflow?: number

    /**
     * How far each child overflows the next one at most, in virtual pixels: as far as needed by default.
     * Never more than the narrowest child and the gap leave of it but a {@link strip}.
     */
    readonly maxOverflow?: number

    /**
     * How much of each child stays in sight, in virtual pixels, enough to point at it: it limits the
     * overflow, and it is what the others keep while one shows whole, less when the width leaves less.
     */
    readonly strip?: number
}

/**
 * Children in a row, centered, as cards are held: a gap between two, and each overflowing the one before it
 * by the same distance, however wide each is. The distance is the least that fits the width, kept between
 * {@link OverflowContainerOptions.minOverflow} and {@link OverflowContainerOptions.maxOverflow}: with room
 * they are side by side, with none they overlap, and when even the most overflow is not enough they scroll
 * (see {@link scrolls}): cut to the container, moved by the wheel and by the focus. While they cover each other, the child under the
 * pointer shows whole: those after it gather on its right, those before it on its left, and it
 * moves left itself when the one after it has no room to go.
 *
 * @remarks
 * It asks as little width as the most overflow lets it, and as much as the least overflow does, so what
 * holds it fits it to its content. Its children overlap, so they are hit from the last: the one drawn over
 * the others. Every move is eased: it ticks while it is shown, and lays its children out again as they move.
 */
export class OverflowContainer extends Container<object> {


    constructor(options: OverflowContainerOptions = {}){
        super()
        this.#gap = options.gap ?? 0
        this.#minOverflow = options.minOverflow ?? 0
        this.#maxOverflow = options.maxOverflow ?? Infinity
        this.#strip = options.strip ?? DEFAULT_STRIP
    }


    public override get childrenMayOverlap(): boolean {
        return true
    }

    /** The space between two children when none overflows, in virtual pixels. */
    public get gap(): number { return this.#gap }

    public set gap(gap: number){
        if(gap === this.#gap) return
        this.#gap = gap
        internals.markLayout(this)
    }

    /**
     * Would a width be too short for the children, even with the most overflow? They are then wider than
     * it, and held in something that scrolls.
     */
    public scrolls(width: number): boolean {
        return width < this.#widthWith(this.#widths(), this.#limits(this.#widths()).max)
    }

    /**
     * Would a width show every child, whichever one is pointed at: that one whole, with the gap after it,
     * the last one whole, and a strip of each of the others? Stricter than {@link scrolls}, which only asks
     * that they fit.
     */
    public showsAll(width: number): boolean {
        const widths = this.#widths()
        const last = widths.pop() ?? 0
        const widest = Math.max(0, ...widths)
        const strips = Math.max(0, widths.length - 1) * this.#strip
        return widest + (widths.length > 0 ? this.#gap : 0) + last + strips <= width
    }

    /**
     * How far the children are scrolled, in whole virtual pixels, from 0 to how far they pass the width.
     * They scroll only when {@link scrolls} says so, by the wheel, or by the focus moving to one out of view.
     */
    public get offset(): number { return this.#offset }

    public set offset(offset: number){
        this.#setOffset(offset)
    }

    protected defaultSlot(): object {
        return {}
    }

    protected override get interactive(): boolean {
        return this.#maxOffset > 0
    }

    protected override get scrollX(): number {
        return this.#offset
    }

    /** The children are cut to the container only while they scroll, as a scissor is refused under a pose. */
    protected override viewport(): Readonly<Rect>|null {
        return this.#maxOffset > 0 ? this.#viewport : null
    }

    protected override handle(event: UiEvent): void {
        if(event.type !== "wheel" || this.#maxOffset === 0) return
        this.#setOffset(this.#offset + (event.dy || event.dx) * WHEEL_STEP)
        event.consume()
    }

    protected override reveal(rect: Readonly<Rect>): void {
        const { width } = this.bounds
        if(rect.x < this.#offset) this.#setOffset(rect.x)
        else if(rect.x + rect.width > this.#offset + width) this.#setOffset(rect.x + rect.width - width)
    }

    /** As wide as the most overflow allows at least, and as the least overflow does at best. */
    protected computeHint(): SizeHint {
        const hints = this.#shown().map(child => child.measure(Infinity))
        const widths = hints.map(hint => hint.preferredWidth)
        const { min, max } = this.#limits(widths)
        return sizeHint(
            this.#widthWith(widths, max),
            Math.max(0, ...hints.map(hint => hint.minHeight)),
            this.#widthWith(widths, min),
            Math.max(0, ...hints.map(hint => hint.preferredHeight)),
        )
    }

    /** Draws nothing of its own: its children draw. */
    protected paint(): void {}

    protected override arranged(): void {
        this.ticking = true
        const shown = this.#shown()
        const { width, height } = this.bounds
        const widths = shown.map(child => Math.min(child.measure(Infinity).preferredWidth, width))
        const pointed = this.#pointed ? shown.indexOf(this.#pointed) : -1
        const goals = this.#leftsOf(widths, width, pointed)
        this.#viewport.set(0, 0, width, height)
        this.#setOffset(this.#offset)
        this.#goals.clear()
        for(const child of this.#lefts.keys()) if(!shown.includes(child)) this.#lefts.delete(child)
        shown.forEach((child, index) => {
            this.#goals.set(child, goals[index])
            const left = Math.round(this.#lefts.get(child) ?? goals[index])
            if(!this.#lefts.has(child)) this.#lefts.set(child, goals[index])
            const childHeight = Math.min(child.measure(widths[index]).preferredHeight, height)
            const top = Math.floor((height - childHeight) / 2)
            this.place(child, this.#rect.set(left, top, widths[index], childHeight))
        })
    }

    /** Follow the pointer: ease each child toward where it goes, and lay out again while one moves. */
    protected override tick(dt: number): void {
        const pointed = this.#pointedChild()
        if(pointed !== this.#pointed){
            this.#pointed = pointed
            this.arranged()
        }
        let moved = false
        for(const [child, goal] of this.#goals){
            const now = this.#lefts.get(child) ?? goal
            if(now === goal) continue
            const next = now + (goal - now) * Math.min(1, SLIDE_RATE * dt)
            const settled = Math.abs(goal - next) < SLIDE_SNAP ? goal : next
            this.#lefts.set(child, settled)
            moved ||= Math.round(settled) !== Math.round(now)
        }
        if(moved) this.arranged()
    }


    #gap: number
    readonly #minOverflow: number
    readonly #maxOverflow: number
    readonly #strip: number
    readonly #rect = new Rect()
    readonly #point = { x: 0, y: 0 }
    readonly #viewport = new Rect()
    #offset = 0

    /** How far the children pass the width, 0 while they fit. */
    #maxOffset = 0

    #setOffset(offset: number): void {
        const clamped = Math.max(0, Math.min(this.#maxOffset, Math.round(offset)))
        if(clamped === this.#offset) return
        this.#offset = clamped
        this.invalidate()
    }

    /** Where each child stands now, from the left, in virtual pixels, easing toward its goal. */
    readonly #lefts = new Map<Component, number>()

    /** Where each child goes, from the left, as the last layout set it. */
    readonly #goals = new Map<Component, number>()

    /** The child pointed at, none when none is. */
    #pointed: Component|null = null

    #shown(): Component[] {
        return this.children.filter(child => child.visible)
    }

    #widths(): number[] {
        return this.#shown().map(child => child.measure(Infinity).preferredWidth)
    }

    /**
     * The least and the most a child may overflow the next one: the options, the most held to what leaves
     * the narrowest child its strip, and never under the least.
     */
    #limits(widths: readonly number[]): { readonly min: number, readonly max: number } {
        const narrowest = Math.min(...widths)
        const max = Math.max(0, Math.min(this.#maxOverflow, narrowest + this.#gap - this.#strip))
        return { min: Math.min(this.#minOverflow, max), max }
    }

    /** How wide the children are side by side, each overflowing the next by a distance. */
    #widthWith(widths: readonly number[], overflow: number): number {
        if(widths.length === 0) return 0
        const total = widths.reduce((sum, each) => sum + each, 0)
        return total + (widths.length - 1) * (this.#gap - overflow)
    }

    /** How far each child overflows the next one in a width: the least that fits, within the limits. */
    #overflowIn(widths: readonly number[], width: number): number {
        const count = widths.length
        const { min, max } = this.#limits(widths)
        if(count < 2) return 0
        const missing = this.#widthWith(widths, 0) - width
        return Math.max(min, Math.min(max, missing / (count - 1)))
    }

    /**
     * Where each child goes, from the left. Each overflows the next by the same distance, centered when
     * they are narrower than the width, from its left edge when wider. When they overflow more than they
     * ask for, a child pointed at shows whole: see {@link #revealed}.
     *
     * @param pointed - The index of the child pointed at, -1 for none.
     */
    #leftsOf(widths: readonly number[], width: number, pointed: number): number[] {
        const count = widths.length
        if(count === 0) return []
        const overflow = this.#overflowIn(widths, width)
        const lefts: number[] = []
        let left = 0
        for(const each of widths){
            lefts.push(left)
            left += each + this.#gap - overflow
        }
        const used = left - this.#gap + overflow
        this.#maxOffset = Math.max(0, Math.round(used) - width)
        // Children cover each other once they overflow by more than the gap that parts them.
        const covering = overflow > this.#gap
        const placed = covering && count > 1 ? this.#revealed(lefts, widths, pointed, used) : lefts
        const start = used <= width ? Math.floor((width - used) / 2) : 0
        return placed.map(each => start + Math.round(each))
    }

    /**
     * Where each child goes when one is pointed at, from the left of the children: it shows whole, those
     * after it spread over the room on its right, those before it over the room on its left, and when the
     * room on its right is too short for the ones after, it moves left. Each of the others keeps a strip
     * in sight, so it can still be pointed at. No child ever passes the next one.
     *
     * @param lefts - Where each goes with none pointed at.
     * @param used - How wide they are together.
     * @param pointed - The index of the child pointed at, -1 for none.
     */
    #revealed(lefts: readonly number[], widths: readonly number[], pointed: number, used: number): number[] {
        const count = lefts.length
        // The last one shows whole already.
        if(pointed < 0 || pointed === count - 1) return [...lefts]
        const end = used - widths[count - 1]
        const whole = widths[pointed] + this.#gap
        const followers = count - 1 - pointed
        // What the width leaves to the others, the last one being whole, shared when it is short.
        const strip = count > 2 ? Math.min(this.#strip, Math.max(0, (end - whole) / (count - 2))) : 0
        const furthest = end - (followers - 1) * strip - whole
        const at = Math.max(pointed * strip, Math.min(lefts[pointed], furthest))
        const after = Math.min(end, at + whole)
        const moved = [...lefts]
        moved[pointed] = at
        for(let index = 0; index < pointed; index++){
            moved[index] = lefts[pointed] > 0 ? lefts[index] * at / lefts[pointed] : 0
        }
        const first = lefts[pointed + 1]
        for(let step = 1; step <= followers; step++){
            const share = end > first ? (lefts[pointed + step] - first) / (end - first) : 1
            moved[pointed + step] = after + share * (end - after)
        }
        return moved
    }

    /**
     * The child pointed at: the one holding the component under the pointer. Over the container but over
     * none of its children, the one pointed at before stays, so a child moving out from under the pointer
     * as it shows whole keeps being pointed at.
     */
    #pointedChild(): Component|null {
        const host = internals.shownHostOf(this)
        if(!host) return null
        const hovered = host.hovered ?? null
        let child = hovered
        while(child && child.parent !== this) child = child.parent
        if(child) return child
        // Something else is hovered, unless a holder around it takes the pointer for its whole content, as
        // an option of a choice does: its children are never hovered, so the pointer is read where it is.
        if(hovered && hovered !== this && !this.#heldBy(hovered)) return null
        const point = this.#point
        if(!internals.localPoint(this, host.pointerX, host.pointerY, point)) return null
        const { width, height } = this.bounds
        if(point.x < 0 || point.y < 0 || point.x >= width || point.y >= height) return null
        point.x += this.#offset
        const shown = this.#shown()
        for(let index = shown.length - 1; index >= 0; index--){
            if(shown[index].bounds.containsPoint(point.x, point.y)) return shown[index]
        }
        return this.#pointed
    }

    /** Is a component a container above this one that holds the pointer for all it contains? */
    #heldBy(component: Component): boolean {
        if(!(component instanceof Container) || !internals.holdsPointer(component)) return false
        for(let parent = this.parent; parent; parent = parent.parent) if(parent === component) return true
        return false
    }
}
