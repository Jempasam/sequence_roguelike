import { Color } from "../math"

/** The lowest contrast a text keeps with its background before it is outlined: the one of large text. */
export const MIN_CONTRAST = 3

/** The two colors an outline is made in, shared so choosing one allocates nothing. */
const BLACK = new Color(0, 0, 0)
const WHITE = new Color(1, 1, 1)

/** A color as its channels from 0 to 1: a {@link Color}, or the channels a text names. */
export type Tint =
    |Readonly<{ r: number, g: number, b: number }>
    |readonly [r: number, g: number, b: number, a?: number]

/** One channel of a color in linear light, as the relative luminance reads it. */
function linear(channel: number): number {
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

/** The red, green and blue channels of a color. */
function channelsOf(tint: Tint): readonly [number, number, number] {
    return "r" in tint ? [tint.r, tint.g, tint.b] : [tint[0], tint[1], tint[2]]
}

/** How bright a color looks, from 0 for black to 1 for white: the relative luminance of the WCAG. */
export function luminance(tint: Tint): number {
    const [r, g, b] = channelsOf(tint)
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** How well two colors tell apart, from 1 for the same to 21 for black and white: the WCAG contrast ratio. */
export function contrastRatio(first: Tint, second: Tint): number {
    const one = luminance(first)
    const other = luminance(second)
    return (Math.max(one, other) + 0.05) / (Math.min(one, other) + 0.05)
}

/**
 * The color of an outline that keeps a color readable over a background: none when the color already tells
 * apart from the background, else the one of black and white that contrasts the most with the color.
 *
 * @param minRatio - The contrast the color must keep with the background not to need an outline.
 */
export function outlineAgainst(color: Tint, backdrop: Tint, minRatio = MIN_CONTRAST): Color|null {
    if(contrastRatio(color, backdrop) >= minRatio) return null
    return contrastRatio(color, BLACK) >= contrastRatio(color, WHITE) ? BLACK : WHITE
}
