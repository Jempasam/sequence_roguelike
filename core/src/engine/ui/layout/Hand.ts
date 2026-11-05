import { internals } from "../Component"
import type { Component } from "../Component"
import { Container } from "../Container"
import { Rect } from "../Rect"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"

/** How fast a child moves to where it goes, as the share of the way left it goes each second. */
const SLIDE_RATE = 18

/** How much of each child stays in sight by default while another shows whole, in virtual pixels. */
const DEFAULT_STRIP = 10

/** How close to where it goes a child is put there at once, in virtual pixels. */
const SLIDE_SNAP = 0.5

/** How a hand is set up. */
export interface HandOptions {
    /** The space between two children when there is room, in virtual pixels, none by default. */
    readonly gap?: number

    /**
     * How much of each child stays in sight while another shows whole, in virtual pixels, enough to point at
     * it. Less when the width leaves less: see {@link Hand.showsAll}.
     */
    readonly strip?: number
}

/**
 * Children in a row, centered, as cards are held: a gap between two when there is room, and overlapping,
 * each over the one before, when there is not. Then the child under the pointer shows whole: those after it
 * gather on its right, those before it on its left, and it moves left itself when the one after it has no
 * room to go.
 *
 * @remarks
 * Its children overlap, so they are hit from the last: the one drawn over the others. Every move is eased:
 * it ticks while it is shown, and lays its children out again as they move.
 */
export class Hand extends Container<object> {


    constructor(options: HandOptions = {}){
        super()
        this.#gap = options.gap ?? 0
        this.#strip = options.strip ?? DEFAULT_STRIP
    }


    public override get childrenMayOverlap(): boolean {
        return true
    }

    /** The space between two children when there is room, in virtual pixels. */
    public get gap(): number { return this.#gap }

    public set gap(gap: number){
        if(gap === this.#gap) return
        this.#gap = gap
        internals.markLayout(this)
    }


    /**
     * Would a width show every child, whichever one is pointed at: that one whole, with the gap after it,
     * the last one whole, and a strip of each of the others?
     */
    public showsAll(width: number): boolean {
        const widths = this.children.map(child => child.measure(Infinity).preferredWidth)
        const last = widths.pop() ?? 0
        const widest = Math.max(0, ...widths)
        const strips = Math.max(0, widths.length - 1) * this.#strip
        return widest + (widths.length > 0 ? this.#gap : 0) + last + strips <= width
    }

    protected defaultSlot(): object {
        return {}
    }

    /** As wide as the children side by side, gaps included, and at least as wide as the widest. */
    protected computeHint(maxWidth: number): SizeHint {
        let widest = 0
        let minHeight = 0
        let preferredWidth = 0
        let preferredHeight = 0
        let count = 0
        for(const child of this.children){
            if(!child.visible) continue
            const hint = child.measure(maxWidth)
            widest = Math.max(widest, hint.preferredWidth)
            minHeight = Math.max(minHeight, hint.minHeight)
            preferredHeight = Math.max(preferredHeight, hint.preferredHeight)
            preferredWidth += hint.preferredWidth
            count++
        }
        preferredWidth += Math.max(0, count - 1) * this.#gap
        return sizeHint(widest, minHeight, preferredWidth, preferredHeight)
    }

    /** Draws nothing of its own: its children draw. */
    protected paint(): void {}

    protected override arranged(): void {
        this.ticking = true
        const shown = this.children.filter(child => child.visible)
        const { width, height } = this.bounds
        const widths = shown.map(child => Math.min(child.measure(width).preferredWidth, width))
        const pointed = this.#pointed ? shown.indexOf(this.#pointed) : -1
        const goals = this.#leftsOf(widths, width, pointed)
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
    readonly #strip: number
    readonly #rect = new Rect()
    readonly #area = new Rect()

    /** Where each child stands now, from the left, in virtual pixels, easing toward its goal. */
    readonly #lefts = new Map<Component, number>()

    /** Where each child goes, from the left, as the last layout set it. */
    readonly #goals = new Map<Component, number>()

    /** The child pointed at, none when none is. */
    #pointed: Component|null = null

    /**
     * Where each child goes, from the left. With room, side by side with a gap, centered. Without, spread
     * evenly over the width, overlapping, the first at the left edge and the last at the right one; then a
     * child pointed at shows whole: those after it spread over the room on its right, those before it over
     * the room on its left, and when the room on its right is too short for the ones after, it moves left.
     * Each of the others keeps a strip in sight, so it can still be pointed at. No child ever passes the
     * next one.
     *
     * @param pointed - The index of the child pointed at, -1 for none.
     */
    #leftsOf(widths: readonly number[], width: number, pointed: number): number[] {
        const count = widths.length
        const total = widths.reduce((sum, each) => sum + each, 0) + Math.max(0, count - 1) * this.#gap
        if(total <= width || count < 2){
            let left = Math.floor((width - total) / 2)
            return widths.map(each => {
                const at = left
                left += each + this.#gap
                return at
            })
        }
        const end = width - widths[count - 1]
        const stride = end / (count - 1)
        const lefts = widths.map((_, index) => Math.round(index * stride))
        // The last one shows whole already.
        if(pointed < 0 || pointed === count - 1) return lefts
        const whole = widths[pointed] + this.#gap
        const followers = count - 1 - pointed
        // What the width leaves to the others, the last one being whole, shared when it is short.
        const strip = count > 2 ? Math.min(this.#strip, Math.max(0, (end - whole) / (count - 2))) : 0
        const furthest = end - (followers - 1) * strip - whole
        const at = Math.max(pointed * strip, Math.min(lefts[pointed], furthest))
        const after = Math.min(end, at + whole)
        lefts[pointed] = Math.round(at)
        for(let index = 0; index < pointed; index++) lefts[index] = Math.round(index * at / pointed)
        for(let step = 1; step <= followers; step++){
            const share = followers === 1 ? 1 : (step - 1) / (followers - 1)
            lefts[pointed + step] = Math.round(after + share * (end - after))
        }
        return lefts
    }

    /**
     * The child pointed at: the one holding the component under the pointer. Over the hand but over none
     * of its children, the one pointed at before stays, so a child moving out from under the pointer as
     * it shows whole keeps being pointed at.
     */
    #pointedChild(): Component|null {
        const host = internals.shownHostOf(this)
        let hovered = host?.hovered ?? null
        while(hovered && hovered.parent !== this) hovered = hovered.parent
        if(hovered || !host || !this.#pointed) return hovered
        const area = this.#area
        const inside = internals.absoluteArea(this, area) && area.containsPoint(host.pointerX, host.pointerY)
        return inside ? this.#pointed : null
    }
}
