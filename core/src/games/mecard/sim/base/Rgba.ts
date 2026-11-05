import type { ColoredText, Text } from "../../../../semantic"

/**
 * A color, its channels from 0 to 1, alpha not premultiplied. The simulation names its colors with it, since
 * it does not see the color of the engine.
 */
export interface Rgba {
    readonly r: number
    readonly g: number
    readonly b: number
    readonly a: number
}

/** A color from its channels, opaque by default. */
export function rgba(r: number, g: number, b: number, a = 1): Rgba {
    return { r, g, b, a }
}

/** A part of a text in a color. */
export function colored(color: Rgba, text: Text): ColoredText {
    return { color: [color.r, color.g, color.b, color.a], text }
}
