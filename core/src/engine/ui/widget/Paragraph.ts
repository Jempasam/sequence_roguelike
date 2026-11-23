import type { Painter } from "../../gpu"
import type { Color } from "../../math"
import { spansOf } from "../../../semantic"
import type { Text, TextDisplay, TextSpan } from "../../../semantic"
import { outlineAgainst, TextLayout } from "../../text"

import { Component } from "../Component"
import type { UiEvent } from "../input/UiEvent"
import { offsetOf } from "../layout/Box"
import { Rect } from "../Rect"
import { sizeHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import type { Theme } from "../Theme"
import type { LabelOptions, TextAlign } from "./Label"

/** How a paragraph is set up beyond its theme and text. */
export interface ParagraphOptions extends LabelOptions {
    /** How it shows the objects of its text, the way of the theme by default. */
    readonly display?: TextDisplay

    /** Hear what the pointer is over in its text, set by {@link Paragraph.onLink}. */
    readonly onLink?: LinkListener

    /**
     * The tint of what the text lies on, none by default. A piece of text that tells too little apart from it
     * is outlined, in black or in white, on its own: see {@link Paragraph.backdrop}.
     */
    readonly backdrop?: Readonly<Color>
}

/**
 * Hear of a part of a text the pointer came over, or that it left the last one.
 *
 * @param link - What the part links to, none when the pointer left it.
 * @param area - Where the part lies on the layer, none when the pointer left it.
 */
export type LinkListener = (link: object|null, area: Readonly<Rect>|null) => void

/**
 * Text over several lines, cut at the spaces, then between two characters when a word does not fit. Its
 * height follows the width it is given, and the lines out of the zone being drawn are skipped.
 *
 * @remarks
 * Its text is a {@link Text}, a string or richer: the parts in a color of their own draw in it, the rest in
 * the color of the paragraph, and the pictures as tall as a line. The objects are told when the text is
 * set, so setting it again tells them again.
 */
export class Paragraph extends Component {


    constructor(
        /** The look of the text. */
        public readonly theme: Theme,

        text: Text = "",
        options: ParagraphOptions = {},
    ){
        super()
        this.#layout = new TextLayout(theme.font, theme.textScale, theme.textPictures ?? null)
        this.#display = options.display ?? theme.textDisplay
        this.#onLink = options.onLink ?? null
        this.#text = text
        this.#spans = spansOf(text, this.#display)
        this.#align = options.align ?? "start"
        this.#color = (options.color ?? theme.textColor).clone()
        this.#outline = options.outline?.clone() ?? null
        this.#backdrop = options.backdrop?.clone() ?? null
        this.#contrasted = this.#needsContrast()
    }


    /** The text shown, its line breaks kept. Setting the same one does nothing. */
    public get text(): Text { return this.#text }

    public set text(text: Text){
        if(text === this.#text) return
        this.#text = text
        this.#spans = spansOf(text, this.#display)
        this.#contrasted = this.#needsContrast()
        this.#link = null
        this.invalidateLayout()
    }

    /** The color of the text, a copy kept by the paragraph. Setting the same one does nothing. */
    public get color(): Readonly<Color> { return this.#color }

    public set color(color: Readonly<Color>){
        if(this.#color.equals(color)) return
        this.#color.copyFrom(color)
        this.#contrastChanged()
    }

    /**
     * The tint of what the text lies on, none for none. Each piece of the text that is too close to it, as
     * the contrast of its color with it says, is outlined in black or in white, whichever tells it apart the
     * most: a white word on a light paper. The outline is of the pieces only, one pixel around them. It
     * leaves the room of one pixel around the text, but only when some piece has one. None of it when the
     * paragraph has an {@link Paragraph.outline}, which outlines all of its text already.
     */
    public get backdrop(): Readonly<Color>|null { return this.#backdrop }

    public set backdrop(backdrop: Readonly<Color>|null){
        if(backdrop === this.#backdrop || (backdrop && this.#backdrop?.equals(backdrop))) return
        this.#backdrop = backdrop?.clone() ?? null
        this.#contrastChanged()
    }

    /** The color of the outline around the text, none for none. Setting the same one does nothing. */
    public get outline(): Readonly<Color>|null { return this.#outline }

    public set outline(outline: Readonly<Color>|null){
        if(outline === this.#outline || (outline && this.#outline?.equals(outline))) return
        const resized = (outline === null) !== (this.#outline === null)
        this.#outline = outline?.clone() ?? null
        this.#contrasted = this.#needsContrast()
        if(resized) this.invalidateLayout()
        else this.invalidate()
    }

    /**
     * Hear what the pointer is over in its text. Only a paragraph hearing it, with links in its text, takes
     * the pointer: any other leaves it to what lies under.
     */
    public get onLink(): LinkListener|null { return this.#onLink }

    public set onLink(listener: LinkListener|null){
        this.#onLink = listener
    }

    /** Where each line lies across the width of the paragraph. */
    public get align(): TextAlign { return this.#align }

    public set align(align: TextAlign){
        if(align === this.#align) return
        this.#align = align
        this.invalidate()
    }


    protected override get interactive(): boolean {
        return this.#onLink !== null && this.#spans.some(span => span.link !== null)
    }

    protected override handle(event: UiEvent): void {
        if(event.type === "pointer-move") this.#point(event)
    }

    protected override hoverChanged(): void {
        if(!this.hovered) this.#setLink(null, null)
    }

    protected computeHint(maxWidth: number): SizeHint {
        const layout = this.#layout
        const border = this.#border
        const lines = layout.spanLines(this.#spans, maxWidth - 2 * border)
        const widest = Math.max(0, ...lines.map(line => layout.spansWidth(line)))
        const height = lines.length * layout.lineHeight + 2 * border
        let narrowest = 0
        for(const span of this.#spans){
            if(span.kind === "string"){
                for(const character of span.text) narrowest = Math.max(narrowest, layout.widthOf(character))
            } else {
                narrowest = Math.max(narrowest, layout.spansWidth([span]))
            }
        }
        return sizeHint(narrowest + 2 * border, height, Math.max(widest, narrowest) + 2 * border, height)
    }

    protected override arranged(): void {
        this.#lines = this.#layout.spanLines(this.#spans, this.bounds.width - 2 * this.#border)
    }

    protected paint(painter: Painter, clip: Readonly<Rect>): void {
        const layout = this.#layout
        const lineHeight = layout.lineHeight
        const border = this.#border
        const outline = this.#outline
        // An outlined line reaches a pixel above and below its own: the lines next to the clip are drawn too.
        const first = Math.max(0, Math.floor((clip.y - 2 * border) / lineHeight))
        const last = Math.min(this.#lines.length, Math.ceil((clip.y + clip.height) / lineHeight))
        painter.push()
        painter.setWhitePixel(this.theme.white)
        for(let index = first; index < last; index++){
            const line = this.#lines[index]
            const x = this.#lineStart(line)
            const y = border + index * lineHeight
            if(outline) layout.drawSpansOutlined(painter, line, x, y, this.#color, outline)
            else if(this.#contrasted){
                layout.drawSpansContrasted(painter, line, x, y, this.#color, this.#outlineOf)
            }
            else layout.drawSpans(painter, line, x, y, this.#color)
        }
        painter.pop()
    }


    readonly #layout: TextLayout
    readonly #display: TextDisplay|undefined
    #text: Text

    /** The text read into pieces, its objects told. */
    #spans: TextSpan[]
    #align: TextAlign
    readonly #color: Color
    #outline: Color|null
    #backdrop: Color|null

    /** Is some piece of its text outlined for want of contrast, so the room of an outline is kept? */
    #contrasted: boolean

    /** The room its outline takes on each side of the text, in pixels. */
    get #border(): number {
        return this.#outline || this.#contrasted ? 1 : 0
    }

    /** The color of the outline of a piece of its text, none when it tells apart from the backdrop. */
    readonly #outlineOf = (span: TextSpan): Color|null => {
        const backdrop = this.#backdrop
        return backdrop ? outlineAgainst(span.color ?? this.#color, backdrop) : null
    }

    /** Does any piece of its text need an outline of its own against the backdrop? Not with a general one. */
    #needsContrast(): boolean {
        if(this.#outline || this.#backdrop === null) return false
        return this.#spans.some(span => this.#outlineOf(span) !== null)
    }

    /** The color or the backdrop changed: draw it again, laid out again if the room of an outline changed. */
    #contrastChanged(): void {
        const contrasted = this.#needsContrast()
        if(contrasted === this.#contrasted){
            this.invalidate()
            return
        }
        this.#contrasted = contrasted
        this.invalidateLayout()
    }

    /** The lines as drawn, cut at the width of the paragraph. */
    #lines: TextSpan[][] = []

    #onLink: LinkListener|null

    /** What the pointer is over in its text, none when nothing. */
    #link: object|null = null

    /** Where a line starts across the paragraph. */
    #lineStart(line: readonly TextSpan[]): number {
        const room = Math.max(0, this.bounds.width - 2 * this.#border - this.#layout.spansWidth(line))
        return this.#border + offsetOf(this.#align, room)
    }

    /** Find what lies under the pointer, and tell it when it changed. */
    #point(event: UiEvent): void {
        const { lineHeight } = this.#layout
        const index = Math.floor((event.y - this.#border) / lineHeight)
        const line = index >= 0 ? this.#lines.at(index) : undefined
        const start = line ? this.#lineStart(line) : 0
        const place = line ? this.#layout.spanAt(line, event.x - start) : null
        if(!place?.span.link){
            this.#setLink(null, null)
            return
        }
        // The pointer gives where the paragraph lies on the layer, even cut by a scroll around it.
        const left = event.absoluteX - event.x + start + place.x
        const top = event.absoluteY - event.y + this.#border + index * lineHeight
        this.#setLink(place.span.link, new Rect(left, top, place.width, lineHeight))
    }

    #setLink(link: object|null, area: Readonly<Rect>|null): void {
        if(link === this.#link) return
        this.#link = link
        this.#onLink?.(link, area)
    }
}
