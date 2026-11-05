import { internals } from "../Component"
import type { Component, NavigationAxis } from "../Component"
import { Container } from "../Container"
import { Rect } from "../Rect"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"

/**
 * Where a child lies on an axis where it has room: at the `"start"`, the `"center"` or the `"end"`, or
 * `"stretch"`ed over all of it.
 */
export type Align = "start"|"center"|"end"|"stretch"

/** How a box lines its children up: side by side in a `"row"`, one under the other in a `"column"`. */
export type BoxDirection = "row"|"column"

/** The slot of a child of a {@link Box}. */
export interface BoxSlot {
    /** Its share of the room left over, none by default. */
    grow: number

    /** Where it lies across the box, the alignment of the box when none. */
    align: Align|null
}

/** How a box is set up beyond its direction. */
export interface BoxOptions {
    /** The space between two children, in virtual pixels, none by default. */
    readonly gap?: number

    /** The space around the children, in virtual pixels, none by default. */
    readonly padding?: number

    /** Where the children lie across the box, `"stretch"` by default. */
    readonly align?: Align
}

/**
 * A row or a column of children.
 *
 * @remarks
 * Along the box, each child takes its preferred size. Room left over goes to the children by their
 * `grow`, and stays at the end when none grows. Room lacking, each child shrinks from its preferred size
 * toward its minimum, in proportion to the gap between the two. Below the minimums, each child gets its
 * minimum and the end overflows, cut at the bounds of the box. Across the box, `align` places or
 * stretches each child. The sizes are whole pixels, the rest of a rounding going to the last child
 * concerned, so they always add up exactly.
 *
 * A column moves the focus with `up` and `down`, a row with `left` and `right`.
 */
export class Box extends Container<BoxSlot> {


    constructor(
        /** How it lines its children up. */
        public readonly direction: BoxDirection,

        options: BoxOptions = {},
    ){
        super()
        this.#gap = options.gap ?? 0
        this.#padding = options.padding ?? 0
        this.#align = options.align ?? "stretch"
    }


    /** The space between two children, in virtual pixels. */
    public get gap(): number { return this.#gap }

    public set gap(gap: number){
        if(gap === this.#gap) return
        this.#gap = gap
        internals.markLayout(this)
    }

    /** The space around the children, in virtual pixels. */
    public get padding(): number { return this.#padding }

    public set padding(padding: number){
        if(padding === this.#padding) return
        this.#padding = padding
        internals.markLayout(this)
    }

    /** Where the children lie across the box, unless their slot says otherwise. */
    public get align(): Align { return this.#align }

    public set align(align: Align){
        if(align === this.#align) return
        this.#align = align
        internals.markLayout(this)
    }


    protected defaultSlot(): BoxSlot {
        return { grow: 0, align: null }
    }

    protected override get navigationAxis(): NavigationAxis {
        return this.direction === "column" ? "vertical" : "horizontal"
    }

    protected computeHint(maxWidth: number): SizeHint {
        const isColumn = this.direction === "column"
        const inner = maxWidth - 2 * this.#padding
        let minMain = 0
        let preferredMain = 0
        let minCross = 0
        let preferredCross = 0
        const shown = this.#shown()
        for(const child of shown){
            const hint = child.measure(isColumn ? inner : Infinity)
            minMain += isColumn ? hint.minHeight : hint.minWidth
            preferredMain += isColumn ? hint.preferredHeight : hint.preferredWidth
            minCross = Math.max(minCross, isColumn ? hint.minWidth : hint.minHeight)
            preferredCross = Math.max(preferredCross, isColumn ? hint.preferredWidth : hint.preferredHeight)
        }
        const around = 2 * this.#padding + this.#gap * Math.max(0, shown.length - 1)
        const across = 2 * this.#padding
        return isColumn
            ? sizeHint(minCross + across, minMain + around, preferredCross + across, preferredMain + around)
            : sizeHint(minMain + around, minCross + across, preferredMain + around, preferredCross + across)
    }

    /** Draws nothing of its own: its children draw. */
    protected paint(): void {}

    protected override arranged(): void {
        const isColumn = this.direction === "column"
        const { width, height } = this.bounds
        const padding = this.#padding
        const shown = this.#shown()
        const crossSize = Math.max(0, (isColumn ? width : height) - 2 * padding)
        const mainSize = (isColumn ? height : width) - 2 * padding - this.#gap * Math.max(0, shown.length - 1)
        const hints = shown.map(child => child.measure(isColumn ? crossSize : Infinity))
        const sizes = distribute(
            Math.max(0, mainSize),
            hints.map(hint => isColumn ? hint.minHeight : hint.minWidth),
            hints.map(hint => isColumn ? hint.preferredHeight : hint.preferredWidth),
            shown.map(child => this.slotOf(child).grow),
        )
        const rect = this.#rect
        let position = padding
        shown.forEach((child, index) => {
            const main = sizes[index]
            const align = this.slotOf(child).align ?? this.#align
            const preferredCross = isColumn
                ? hints[index].preferredWidth
                : child.measure(main).preferredHeight
            const cross = align === "stretch" ? crossSize : Math.min(preferredCross, crossSize)
            const offset = padding + offsetOf(align, crossSize - cross)
            if(isColumn) rect.set(offset, position, cross, main)
            else rect.set(position, offset, main, cross)
            this.place(child, rect)
            position += main + this.#gap
        })
    }


    #gap: number
    #padding: number
    #align: Align
    readonly #rect = new Rect()

    #shown(): Component[] {
        return this.children.filter(child => child.visible)
    }
}

/** Where something of a size lies in room of a size larger by `room`, by its alignment. */
export function offsetOf(align: Align, room: number): number {
    switch(align){
        case "center": return Math.floor(room / 2)
        case "end": return room
        case "start":
        case "stretch":
            return 0
        default:
            throw new Error(`Unknown alignment ${String(align)}.`)
    }
}

/**
 * Share a length between children, in whole pixels: their preferred sizes and the rest by their growth,
 * or less down to their minimums, or their minimums when even those do not fit.
 */
export function distribute(
    length: number, mins: readonly number[], preferred: readonly number[], grows: readonly number[],
): number[] {
    const sizes = [...preferred]
    const totalPreferred = sum(preferred)
    if(length >= totalPreferred){
        const totalGrow = sum(grows.map(grow => Math.max(0, grow)))
        if(totalGrow <= 0) return sizes
        const extra = length - totalPreferred
        let given = 0
        let last = -1
        grows.forEach((grow, index) => {
            if(grow <= 0) return
            const share = Math.floor(extra * grow / totalGrow)
            sizes[index] += share
            given += share
            last = index
        })
        sizes[last] += extra - given
        return sizes
    }
    if(length < sum(mins)) return [...mins]
    const slacks = preferred.map((size, index) => size - mins[index])
    const totalSlack = sum(slacks)
    const deficit = totalPreferred - length
    let taken = 0
    slacks.forEach((slack, index) => {
        const cut = Math.floor(deficit * slack / totalSlack)
        sizes[index] -= cut
        taken += cut
    })
    // The rest of the rounding, from the last children that can still shrink.
    for(let index = sizes.length - 1; taken < deficit && index >= 0; index--){
        const room = Math.min(sizes[index] - mins[index], deficit - taken)
        sizes[index] -= room
        taken += room
    }
    return sizes
}

function sum(values: readonly number[]): number {
    let total = 0
    for(const value of values) total += value
    return total
}
