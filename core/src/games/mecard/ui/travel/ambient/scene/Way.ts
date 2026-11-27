import type { Random } from "../../../../../../engine/particles"

/** One of the two ways across a space. */
export interface Way {
    /** Does it go from right to left? A picture drawn facing right is then mirrored. */
    readonly reversed: boolean

    /** 1 toward the right, -1 toward the left. */
    readonly sign: 1|-1

    /** Where it is, so many pixels past the side it comes in by: before it when negative. */
    x(along: number): number
}

/** One of the two ways across a stretch from `left`, `width` pixels wide, drawn at random. */
export function wayAcross(random: Random, left: number, width: number): Way {
    const reversed = random() < 0.5
    const sign = reversed ? -1 : 1
    const side = reversed ? left + width : left
    return { reversed, sign, x: along => side + along * sign }
}
