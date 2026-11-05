import type { Painter } from "../../gpu"
import { Color } from "../../math"
import { TextLayout } from "../../text"

import { Component } from "../Component"
import { offsetOf } from "../layout/Box"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import type { Theme } from "../Theme"

/** Where a line of text lies across the width it is given. */
export type TextAlign = "start"|"center"|"end"

/** How a label is set up beyond its theme and text. */
export interface LabelOptions {
    /** Where its text lies across its width, `"start"` by default. */
    readonly align?: TextAlign

    /** The color of its text, the one of the theme by default. */
    readonly color?: Color

    /**
     * The color of an outline of one pixel around its text, none by default. An outlined text takes one
     * pixel more on each side.
     */
    readonly outline?: Color|null
}

/**
 * One line of text, cut with an ellipsis when room lacks: its minimum width is the one of the ellipsis
 * alone.
 */
export class Label extends Component {


    constructor(
        /** The look of the text. */
        public readonly theme: Theme,

        text = "",
        options: LabelOptions = {},
    ){
        super()
        this.#layout = new TextLayout(theme.font, theme.textScale)
        this.#text = text
        this.#shown = text
        this.#align = options.align ?? "start"
        this.#color = (options.color ?? theme.textColor).clone()
        this.#outline = options.outline?.clone() ?? null
    }


    /** The text shown. Setting the same one does nothing. */
    public get text(): string { return this.#text }

    public set text(text: string){
        if(text === this.#text) return
        this.#text = text
        this.invalidateLayout()
    }

    /** The color of the text, a copy kept by the label. Setting the same one does nothing. */
    public get color(): Readonly<Color> { return this.#color }

    public set color(color: Readonly<Color>){
        if(this.#color.equals(color)) return
        this.#color.copyFrom(color)
        this.invalidate()
    }

    /** The color of the outline around the text, none for none. Setting the same one does nothing. */
    public get outline(): Readonly<Color>|null { return this.#outline }

    public set outline(outline: Readonly<Color>|null){
        if(outline === this.#outline || (outline && this.#outline?.equals(outline))) return
        const resized = (outline === null) !== (this.#outline === null)
        this.#outline = outline?.clone() ?? null
        if(resized) this.invalidateLayout()
        else this.invalidate()
    }

    /** Where the text lies across the width of the label. */
    public get align(): TextAlign { return this.#align }

    public set align(align: TextAlign){
        if(align === this.#align) return
        this.#align = align
        this.invalidate()
    }


    protected computeHint(): SizeHint {
        const layout = this.#layout
        const border = this.#border
        const width = layout.widthOf(this.#text) + 2 * border
        const height = layout.lineHeight + 2 * border
        return sizeHint(Math.min(width, layout.widthOf(layout.ellipsis) + 2 * border), height, width, height)
    }

    protected override arranged(): void {
        this.#shown = this.#layout.fit(this.#text, this.bounds.width - 2 * this.#border)
    }

    protected paint(painter: Painter): void {
        const layout = this.#layout
        const { width, height } = this.bounds
        const room = Math.max(0, width - 2 * this.#border - layout.widthOf(this.#shown))
        const left = this.#border + offsetOf(this.#align, room)
        const top = Math.floor((height - layout.lineHeight) / 2)
        if(this.#outline) layout.drawOutlined(painter, this.#shown, left, top, this.#color, this.#outline)
        else {
            painter.setTint(this.#color)
            layout.draw(painter, this.#shown, left, top)
        }
    }


    readonly #layout: TextLayout
    #text: string

    /** The text as drawn, cut to the width of the label. */
    #shown: string

    #align: TextAlign
    readonly #color: Color
    #outline: Color|null

    /** The room its outline takes on each side of the text, in pixels. */
    get #border(): number {
        return this.#outline ? 1 : 0
    }
}
