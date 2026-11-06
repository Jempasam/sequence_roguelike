import { internals } from "../Component"
import type { Component } from "../Component"
import { Container } from "../Container"
import { Rect } from "../Rect"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"

/** How a wrapping box is set up. */
export interface WrapBoxOptions {
    /** The space between two children of a line, and between two lines, in virtual pixels, none by default. */
    readonly gap?: number

    /** Where each line lies in the width of the box, `"center"` by default. */
    readonly align?: "start"|"center"
}

/** A line of a wrapping box: the children it holds, and the room they take. */
interface Line {
    readonly children: Component[]
    readonly widths: number[]
    width: number
    height: number
}

/**
 * Children side by side in lines, each at its preferred size, a new line starting where the next child
 * would not fit. Each line is centered in the width of the box.
 *
 * @remarks
 * Its height is that of its lines, so inside a vertical scroll it grows with the lines and scrolls. A child
 * wider than the box takes a line of its own, cut at the bounds.
 */
export class WrapBox extends Container<object> {


    constructor(options: WrapBoxOptions = {}){
        super()
        this.#gap = options.gap ?? 0
        this.#align = options.align ?? "center"
    }


    /** The space between two children of a line, and between two lines, in virtual pixels. */
    public get gap(): number { return this.#gap }

    public set gap(gap: number){
        if(gap === this.#gap) return
        this.#gap = gap
        internals.markLayout(this)
    }


    protected defaultSlot(): object {
        return {}
    }

    protected computeHint(maxWidth: number): SizeHint {
        const lines = this.#lines(maxWidth)
        let widest = 0
        let minWidth = 0
        let height = 0
        for(const line of lines){
            widest = Math.max(widest, line.width)
            height += line.height
        }
        for(const child of this.#shown()) minWidth = Math.max(minWidth, child.measure(Infinity).minWidth)
        height += this.#gap * Math.max(0, lines.length - 1)
        return sizeHint(minWidth, height, widest, height)
    }

    /** Draws nothing of its own: its children draw. */
    protected paint(): void {}

    protected override arranged(): void {
        const { width } = this.bounds
        const lines = this.#lines(width)
        const rect = this.#rect
        let top = 0
        for(const line of lines){
            let left = this.#align === "start" ? 0 : Math.floor((width - line.width) / 2)
            line.children.forEach((child, index) => {
                const childWidth = line.widths[index]
                const childHeight = child.measure(childWidth).preferredHeight
                rect.set(left, top + Math.floor((line.height - childHeight) / 2), childWidth, childHeight)
                this.place(child, rect)
                left += childWidth + this.#gap
            })
            top += line.height + this.#gap
        }
    }


    #gap: number
    readonly #align: "start"|"center"
    readonly #rect = new Rect()

    #shown(): Component[] {
        return this.children.filter(child => child.visible)
    }

    /** The lines the children fall into at a width, in order. */
    #lines(maxWidth: number): Line[] {
        const lines: Line[] = []
        let line: Line|null = null
        for(const child of this.#shown()){
            const hint = child.measure(Infinity)
            const childWidth = hint.preferredWidth
            const childHeight = child.measure(childWidth).preferredHeight
            if(line === null || line.width + this.#gap + childWidth > maxWidth){
                line = { children: [], widths: [], width: 0, height: 0 }
                lines.push(line)
            }
            line.width += line.children.length > 0 ? this.#gap + childWidth : childWidth
            line.height = Math.max(line.height, childHeight)
            line.children.push(child)
            line.widths.push(childWidth)
        }
        return lines
    }
}
