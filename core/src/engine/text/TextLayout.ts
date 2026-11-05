import type { Painter, Point } from "../gpu"
import { Color } from "../math"

import type { BitmapFont } from "./BitmapFont"
import { svgContours } from "../../semantic"
import type { SvgPath, TextColor, TextSpan } from "../../semantic"

/** A piece of a line and where it lies on it, in pixels from the start of the line. */
export interface SpanPlace {
    readonly span: TextSpan
    readonly x: number
    readonly width: number
}

/** The ellipsis ending a cut text, when the font has the character. */
const ELLIPSIS = "…"

/** The ellipsis ending a cut text, when the font lacks the character. */
const ASCII_ELLIPSIS = "..."

/** Where a text is drawn again around itself to outline it: the eight ways around each of its pixels. */
const OUTLINE_OFFSETS: readonly (readonly [number, number])[] = [
    [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
]

/**
 * A font at a whole scale, and what it does with a text: measure it, cut it into lines at a width, cut it
 * with an ellipsis, and draw it.
 *
 * @remarks
 * Every position is a whole pixel: the advances of a font are whole, and so is the scale, so a glyph never
 * lands between two pixels and blurs. The characters are read by code point, so a character outside the
 * basic plane counts as one.
 *
 * The pieces of a {@link Text} lay out the same way, from {@link spansOf}: a line is then pieces in their
 * colors, and a picture is a square as tall as a line, which a line is never cut inside.
 */
export class TextLayout {


    /** What ends a text cut short: `…`, or `...` when the font lacks it. */
    public readonly ellipsis: string

    /**
     * @param scale - The factor the font is drawn at, a positive whole number.
     * @throws {@link Error} When the scale is not a positive whole number.
     */
    constructor(
        /** The font the text is drawn with. */
        public readonly font: BitmapFont,

        public readonly scale = 1,
    ){
        if(!Number.isInteger(scale) || scale <= 0){
            throw new Error(`A bitmap font scales by a positive whole factor, not ${scale}.`)
        }
        this.ellipsis = font.has(ELLIPSIS) ? ELLIPSIS : ASCII_ELLIPSIS
    }


    /** The distance between two lines, in pixels. */
    public get lineHeight(): number { return this.font.lineHeight * this.scale }

    /** The width of a text on one line, in pixels. Line breaks count as nothing. */
    public widthOf(text: string): number {
        let width = 0
        for(const character of text){
            if(character !== "\n") width += this.font.glyphOf(character).advance
        }
        return width * this.scale
    }

    /**
     * Cut a text into lines no wider than a width: at the spaces, at each line break, and inside a word
     * that does not fit on a line of its own. The spaces where a line is cut are dropped.
     *
     * @param maxWidth - The widest a line may be, in pixels, `Infinity` to cut only at the line breaks.
     */
    public lines(text: string, maxWidth: number): string[] {
        const lines: string[] = []
        for(const paragraph of text.split("\n")) this.#wrap(paragraph, maxWidth, lines)
        return lines
    }

    /**
     * The text itself when it fits in a width, or its longest start that fits followed by the ellipsis.
     * The ellipsis alone, when not even it fits.
     */
    public fit(text: string, maxWidth: number): string {
        if(this.widthOf(text) <= maxWidth) return text
        const characters = [...text]
        const room = maxWidth - this.widthOf(this.ellipsis)
        let width = 0
        let kept = 0
        while(kept < characters.length){
            const next = this.font.glyphOf(characters[kept]).advance * this.scale
            if(width + next > room) break
            width += next
            kept++
        }
        return characters.slice(0, kept).join("").trimEnd() + this.ellipsis
    }

    /**
     * Where the boundary between two characters nearest a position lies, as a count of characters from
     * the start: what a click in a text field points at.
     *
     * @param x - The position, in pixels from the start of the text.
     */
    public indexAt(text: string, x: number): number {
        let width = 0
        let index = 0
        for(const character of text){
            const advance = this.font.glyphOf(character).advance * this.scale
            if(x < width + advance / 2) return index
            width += advance
            index++
        }
        return index
    }

    /** The width of pieces of text on one line, in pixels. */
    public spansWidth(spans: readonly TextSpan[]): number {
        let width = 0
        for(const span of spans) width += span.kind === "string" ? this.widthOf(span.text) : this.lineHeight
        return width
    }

    /**
     * The piece of a line at a position, and where it lies, none past the ends of the line.
     *
     * @param x - The position, in pixels from the start of the line.
     */
    public spanAt(line: readonly TextSpan[], x: number): SpanPlace|null {
        let pen = 0
        for(const span of line){
            const width = this.spansWidth([span])
            if(x >= pen && x < pen + width) return { span, x: pen, width }
            pen += width
        }
        return null
    }

    /**
     * Cut pieces of text into lines as {@link TextLayout.lines} cuts a string, each line its pieces in their
     * colors.
     *
     * @param maxWidth - The widest a line may be, in pixels, `Infinity` to cut only at the line breaks.
     */
    public spanLines(spans: readonly TextSpan[], maxWidth: number): TextSpan[][] {
        const lines: TextSpan[][] = []
        for(const paragraph of paragraphsOf(spans)) this.#wrapWords(paragraph, maxWidth, lines)
        return lines.map(merged)
    }

    /**
     * Draw pieces of text on one line, as {@link TextLayout.draw} draws a string: each in its color, or in
     * the given one for a piece of none, each picture filled with the white pixel of the painter.
     */
    public drawSpans(painter: Painter, spans: readonly TextSpan[], x: number, y: number, color: Color): void {
        let pen = x
        for(const span of spans){
            const own = span.color
            painter.setTint(own ? this.#tint.set(own[0], own[1], own[2], own[3] ?? 1) : color)
            if(span.kind === "string"){
                this.draw(painter, span.text, pen, y)
                pen += this.widthOf(span.text)
                continue
            }
            const side = this.lineHeight
            painter.push()
            painter.translate(pen, y)
            painter.scale(side / span.path.size)
            for(const contour of this.#contoursOf(span.path)) painter.polygon(contour)
            painter.pop()
            pen += side
        }
    }

    /**
     * Draw pieces of text on one line as {@link TextLayout.drawSpans} draws them, over an outline of one
     * pixel around each glyph and picture, in a color of its own whatever the colors of the pieces. The
     * outline goes one pixel beyond the line on each side.
     */
    public drawSpansOutlined(
        painter: Painter, spans: readonly TextSpan[], x: number, y: number, color: Color, outline: Color,
    ): void {
        for(const [dx, dy] of OUTLINE_OFFSETS) this.#drawSpansIn(painter, spans, x + dx, y + dy, outline)
        this.drawSpans(painter, spans, x, y, color)
    }

    /**
     * Draw a text on one line as {@link TextLayout.draw} draws it, in a color, over an outline around each
     * glyph, in another. The outline goes as far beyond the line as it is thick, on each side.
     *
     * @param thickness - How thick the outline is, in pixels, at most the scale of the font plus one: a
     *   thicker one leaves holes between the copies of the text it is made of.
     */
    public drawOutlined(
        painter: Painter, text: string, x: number, y: number, color: Color, outline: Color, thickness = 1,
    ): void {
        painter.setTint(outline)
        for(const [dx, dy] of OUTLINE_OFFSETS){
            this.draw(painter, text, x + dx * thickness, y + dy * thickness)
        }
        painter.setTint(color)
        this.draw(painter, text, x, y)
    }

    /**
     * Draw a text on one line, its top left corner at a point, one sprite per glyph, so a whole text draws
     * in one batch. Line breaks draw nothing. The color is the tint of the painter.
     *
     * @param x - The left of the text, a whole number of pixels.
     * @param y - The top of the line, a whole number of pixels.
     */
    public draw(painter: Painter, text: string, x: number, y: number): void {
        const scale = this.scale
        if(scale !== 1){
            painter.push()
            painter.translate(x, y)
            painter.scale(scale)
        }
        let pen = scale === 1 ? x : 0
        const top = scale === 1 ? y : 0
        for(const character of text){
            if(character === "\n") continue
            const glyph = this.font.glyphOf(character)
            const sprite = glyph.sprite
            if(sprite){
                const left = pen + glyph.offsetX + sprite.originX
                painter.sprite(sprite, left, top + glyph.offsetY + sprite.originY)
            }
            pen += glyph.advance
        }
        if(scale !== 1) painter.pop()
    }


    readonly #tint = new Color()

    /** Draw pieces of text on one line all in one color, their own ignored: the outline of a line. */
    #drawSpansIn(painter: Painter, spans: readonly TextSpan[], x: number, y: number, color: Color): void {
        let pen = x
        painter.setTint(color)
        for(const span of spans){
            if(span.kind === "string"){
                this.draw(painter, span.text, pen, y)
                pen += this.widthOf(span.text)
                continue
            }
            const side = this.lineHeight
            painter.push()
            painter.translate(pen, y)
            painter.scale(side / span.path.size)
            for(const contour of this.#contoursOf(span.path)) painter.polygon(contour)
            painter.pop()
            pen += side
        }
    }

    /** The contours of each path drawn, read once. */
    readonly #contours = new Map<string, Point[][]>()

    #contoursOf(path: SvgPath): Point[][] {
        let contours = this.#contours.get(path.svg)
        if(!contours){
            contours = svgContours(path.svg, path.size)
            this.#contours.set(path.svg, contours)
        }
        return contours
    }

    /** Cut the words of a paragraph into lines, as a string is cut, added to a list. */
    #wrapWords(words: readonly TextSpan[][], maxWidth: number, lines: TextSpan[][]): void {
        let line: TextSpan[] = []
        for(const word of words){
            const joined = line.length === 0 ? word : [...line, { kind: "string", text: " ", color: null, link: null } as const, ...word]
            if(this.spansWidth(joined) <= maxWidth){
                line = joined
                continue
            }
            if(line.length > 0) lines.push(line)
            line = []
            if(this.spansWidth(word) <= maxWidth){
                line = word
                continue
            }
            // A word wider than a line is cut between two characters, or before a picture.
            for(const piece of charactersOf(word)){
                const longer = [...line, piece]
                if(line.length > 0 && this.spansWidth(longer) > maxWidth){
                    lines.push(line)
                    line = [piece]
                } else {
                    line = longer
                }
            }
        }
        lines.push(line)
    }

    /** Cut a paragraph without line breaks into lines no wider than a width, added to a list. */
    #wrap(paragraph: string, maxWidth: number, lines: string[]): void {
        let line = ""
        for(const word of paragraph.split(" ")){
            const joined = line === "" ? word : `${line} ${word}`
            if(this.widthOf(joined) <= maxWidth){
                line = joined
                continue
            }
            if(line !== "") lines.push(line)
            line = ""
            if(this.widthOf(word) <= maxWidth){
                line = word
                continue
            }
            // A word wider than a line is cut between two characters.
            for(const character of word){
                const longer = line + character
                if(line !== "" && this.widthOf(longer) > maxWidth){
                    lines.push(line)
                    line = character
                } else {
                    line = longer
                }
            }
        }
        lines.push(line)
    }
}


/** The paragraphs of pieces of text, cut at the line breaks, each its words, cut at the spaces. */
function paragraphsOf(spans: readonly TextSpan[]): TextSpan[][][] {
    const paragraphs: TextSpan[][][] = []
    let words: TextSpan[][] = []
    let word: TextSpan[] = []
    for(const span of spans){
        if(span.kind === "svg"){
            word.push(span)
            continue
        }
        for(const part of span.text.split(/( |\n)/)){
            if(part === " " || part === "\n"){
                words.push(word)
                word = []
                if(part === "\n"){
                    paragraphs.push(words)
                    words = []
                }
            } else if(part !== ""){
                word.push({ ...span, text: part })
            }
        }
    }
    words.push(word)
    paragraphs.push(words)
    return paragraphs
}

/** The pieces of a word one character or one picture each, in their colors. */
function charactersOf(word: readonly TextSpan[]): TextSpan[] {
    return word.flatMap((span): TextSpan[] => {
        return span.kind === "svg" ? [span] : [...span.text].map(text => ({ ...span, text }))
    })
}

/** A line with each run of strings of the same color and link made one, so it draws a piece per color. */
function merged(line: readonly TextSpan[]): TextSpan[] {
    const pieces: TextSpan[] = []
    for(const span of line){
        const last = pieces.at(-1)
        if(last?.kind === "string" && span.kind === "string" && last.link === span.link && sameColor(last.color, span.color)){
            pieces[pieces.length - 1] = { ...last, text: last.text + span.text }
        } else {
            pieces.push(span)
        }
    }
    return pieces
}

function sameColor(a: TextColor|null, b: TextColor|null): boolean {
    if(a === null || b === null) return a === b
    return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && (a[3] ?? 1) === (b[3] ?? 1)
}
