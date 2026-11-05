/**
 * A color as a text names it, `[r, g, b]` or `[r, g, b, a]`, its channels from 0 to 1, opaque without an
 * alpha.
 */
export type TextColor = readonly [r: number, g: number, b: number, a?: number]

/** A part of a text in a color of its own. */
export interface ColoredText {
    readonly color: TextColor
    readonly text: Text
}

/**
 * A part of a text standing for something its reader may point at: what a reader makes of an object it knows,
 * so a pointer over the part finds the object back.
 */
export interface LinkedText {
    /** What the part stands for. */
    readonly link: object
    readonly text: Text
}

/**
 * A small picture inside a text, as the `d` of an SVG path: its coordinates in a square of {@link size}
 * units, `y` down, drawn as tall as a line. Every command of a path is read, curves and arcs included.
 */
export interface SvgPath {
    readonly svg: string

    /** The side of the square its coordinates are given in. */
    readonly size: number

    /** What it stands for in a plain string, none to leave nothing there. */
    readonly alt?: string
}

/** An object that tells itself as a text richer than a string. */
export interface Semantic {
    toSemString(): Text
}

/** Any object, told by its `toString` when it tells nothing richer. */
export interface Stringable {
    toString(): string
}

/**
 * A text that says what it is about, rather than how it is drawn: strings and numbers, the objects it talks
 * about, and colored parts, a color being something a thing is. What is only a way to show it stays with the
 * reader: a game writes the objects it means, and its interface makes them pictures and links through a
 * {@link TextDisplay}.
 *
 * @remarks
 * An array is its parts end to end, with no space added: `["Je gagne ", 12, " PV."]`. An array holding an
 * array is a group instead, each of its items on a line of its own: `[["A faim"], ["A une potion"]]`. So
 * two texts are put end to end by spreading them, `[...first, ...second]`, never by nesting them.
 *
 * The objects stay objects until the text is shown, each telling itself by its `toSemString`, else its
 * `toString`. {@link plainText} makes it a string.
 */
export type Text = string|number|ColoredText|LinkedText|SvgPath|Semantic|Stringable|readonly Text[]

/** How a reader shows some objects its own way: a text for an object, none to let it tell itself. */
export type TextDisplay = (value: object) => Text|undefined

/**
 * One piece of a text once read: a string or a picture, in a color, none for the color of the reader, and
 * what it links to, none for nothing.
 */
export type TextSpan =
    | { readonly kind: "string", readonly text: string, readonly color: TextColor|null, readonly link: object|null }
    | { readonly kind: "svg", readonly path: SvgPath, readonly color: TextColor|null, readonly link: object|null }

/** How deep a text may hold itself before it is taken for a loop, an object whose text holds the object. */
const MAX_DEPTH = 64

/** The pieces of a text in order, its objects told, its groups one item per line. */
export function spansOf(text: Text, display?: TextDisplay): TextSpan[] {
    const spans: TextSpan[] = []
    read(text, { color: null, link: null }, display, spans, 0)
    return spans
}

/** A text as a plain string: its colors dropped, its pictures as their `alt`, its groups one per line. */
export function plainText(text: Text, display?: TextDisplay): string {
    return spansOf(text, display).map(span => span.kind === "string" ? span.text : span.path.alt ?? "").join("")
}

/** Is an array a group, its items each on a line, rather than parts end to end? */
export function isGroup(parts: readonly Text[]): boolean {
    return parts.some(isArray)
}

/**
 * Texts end to end, as one: each array among them spread, so one never becomes an item of a group. A group
 * among them stays whole.
 */
export function concat(...texts: readonly Text[]): Text[] {
    return texts.flatMap(text => isArray(text) && !isGroup(text) ? text : [text])
}

/**
 * A text built only when read: so two values may name each other in their texts, whichever of them is made
 * first.
 */
export function deferred(text: () => Text): Semantic {
    return { toSemString: text }
}

/** Texts end to end, a separator between each two: `Pas, Recul, Viser`. */
export function joinText(texts: readonly Text[], separator: Text): Text[] {
    return concat(...texts.flatMap((text, index) => index === 0 ? [text] : [separator, text]))
}

/** What the parts around a part of a text hand down to it. */
interface TextContext {
    readonly color: TextColor|null
    readonly link: object|null
}

/** Add the pieces of a text to a list, with what the parts around it hand down. */
function read(
    text: Text, context: TextContext, display: TextDisplay|undefined, spans: TextSpan[], depth: number,
): void {
    if(depth > MAX_DEPTH){
        throw new Error(`A text holds itself more than ${MAX_DEPTH} deep: an object tells itself in its own text.`)
    }
    if(typeof text === "string" || typeof text === "number"){
        spans.push({ kind: "string", text: String(text), ...context })
        return
    }
    if(isArray(text)){
        const group = isGroup(text)
        text.forEach((part, index) => {
            if(group && index > 0) spans.push({ kind: "string", text: "\n", ...context })
            read(part, context, display, spans, depth + 1)
        })
        return
    }
    if(isSvg(text)){
        spans.push({ kind: "svg", path: text, ...context })
        return
    }
    if(isColored(text)){
        read(text.text, { ...context, color: text.color }, display, spans, depth + 1)
        return
    }
    if(isLinked(text)){
        read(text.text, { ...context, link: text.link }, display, spans, depth + 1)
        return
    }
    const shown = display?.(text)
    if(shown !== undefined) read(shown, context, display, spans, depth + 1)
    else if(isSemantic(text)) read(text.toSemString(), context, display, spans, depth + 1)
    else spans.push({ kind: "string", text: String(text), ...context })
}

// `Array.isArray` narrows to a mutable array, which a readonly one is not.
function isArray(text: Text): text is readonly Text[] {
    return Array.isArray(text)
}

function isSvg(text: object): text is SvgPath {
    return typeof (text as Partial<SvgPath>).svg === "string"
}

function isColored(text: object): text is ColoredText {
    return Array.isArray((text as Partial<ColoredText>).color) && "text" in text
}

function isLinked(text: object): text is LinkedText {
    return typeof (text as Partial<LinkedText>).link === "object" && "text" in text
}

function isSemantic(text: object): text is Semantic {
    return typeof (text as Partial<Semantic>).toSemString === "function"
}
