import { Color } from "../../../../engine/math"
import type { ColorMode, Sprite } from "../../../../engine/gpu"
import { NineSlice } from "../../../../engine/ui"
import type { ImagePath } from "../../../../engine/assets"

/** The picture of the worn paper of the maps: the one of the journey, and the one the arena lies on. */
export const PAPER_PATH: ImagePath = "mecard/hud/paper.png"

/** The picture of a path of the maps, running along its height: the paths of the journey, the grid of the arena. */
export const PATH_PICTURE: ImagePath = "mecard/travel/map/path.png"

/** The picture of the darker spot under a place of the journey, or a thing on the arena. */
export const SHADE_PICTURE: ImagePath = "mecard/travel/map/shade.png"

/** The tint of the paper where a text lies on it, its worn margins left out: what a text is read against. */
export const PAPER_TINT = new Color(0.89, 0.82, 0.65)

/** How wide the worn margins of the paper are, in texels. */
export const PAPER_MARGIN = 10

/**
 * The paper as a frame, drawn at a whole factor, its center opaque and repeating so its edges keep their
 * grain at any size.
 *
 * @param paper - The sprite of {@link PAPER_PATH}.
 * @param scale - The whole factor it is drawn at.
 * @param color - What it is multiplied by, white by default: a darker paper.
 * @param colorMode - How the color mixes with the paper, "modulate" by default: "hue" for a paper in another hue.
 */
export function paperFrame(paper: Sprite, scale: number, color?: Color, colorMode?: ColorMode): NineSlice {
    return paperBordered(paper, PAPER_MARGIN * scale, color, colorMode)
}

/**
 * The paper as a frame whose worn margins are squeezed to a thin border, for a small label.
 *
 * @param paper - The sprite of {@link PAPER_PATH}.
 * @param drawn - The width of the border as drawn, in virtual pixels.
 * @param color - What it is multiplied by, white by default.
 * @param colorMode - How the color mixes with the paper, "modulate" by default.
 */
export function paperBordered(paper: Sprite, drawn: number, color?: Color, colorMode?: ColorMode): NineSlice {
    const margin = PAPER_MARGIN
    return new NineSlice(paper, { left: margin, top: margin, right: margin, bottom: margin }, {
        opaqueCenter: true,
        ...color ? { color } : {},
        ...colorMode ? { colorMode } : {},
        border: { left: drawn, top: drawn, right: drawn, bottom: drawn },
        tiling: { mirror: true },
    })
}
