import type { TextColor } from "../../../../semantic"

/** The color behind what a card shows, which a color with some alpha is mixed with before it is compared. */
const BEHIND: TextColor = [0.16, 0.14, 0.22]

/**
 * How far apart two colors are, in a weighted distance between their channels, as "redmean" has it: the eye
 * tells greens apart better than reds, and reds better than blues, and the red it tells the more the redder
 * the colors are. 0 for the same color, about 3 for black and white.
 */
export function colorGap(one: TextColor, other: TextColor): number {
    const [r1, g1, b1] = shownOver(one)
    const [r2, g2, b2] = shownOver(other)
    const red = (r1 + r2) / 2
    const dr = r1 - r2
    const dg = g1 - g2
    const db = b1 - b2
    return Math.sqrt((2 + red) * dr * dr + 4 * dg * dg + (3 - red) * db * db)
}

/** The least gap between two colors that tells them apart at a glance, as small round marks. */
export const MIN_COLOR_GAP = 0.5

/** Are all the colors far enough from each other for a reader to tell any two apart? */
export function colorsDistinct(colors: readonly TextColor[], gap = MIN_COLOR_GAP): boolean {
    return colors.every((one, index) => {
        return colors.every((other, at) => at <= index || colorGap(one, other) >= gap)
    })
}

/** The channels of a color as seen over what a card is drawn on. */
function shownOver(color: TextColor): readonly [number, number, number] {
    const alpha = color[3] ?? 1
    return [
        color[0] * alpha + BEHIND[0] * (1 - alpha),
        color[1] * alpha + BEHIND[1] * (1 - alpha),
        color[2] * alpha + BEHIND[2] * (1 - alpha),
    ]
}
