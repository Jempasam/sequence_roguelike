import type { Sprite } from "../../../../engine/gpu"
import { NineSlice } from "../../../../engine/ui"
import type { ImagePath } from "../../../../engine/assets"

/** The picture of the worn paper of the maps: the one of the journey, and the one the arena lies on. */
export const PAPER_PATH: ImagePath = "mecard/travel/map/paper.png"

/** The picture of a path of the maps, running along its height: the paths of the journey, the grid of the arena. */
export const PATH_PICTURE: ImagePath = "mecard/travel/map/path.png"

/** The picture of the darker spot under a place of the journey, or a thing on the arena. */
export const SHADE_PICTURE: ImagePath = "mecard/travel/map/shade.png"

/** How wide the worn margins of the paper are, in texels. */
export const PAPER_MARGIN = 10

/**
 * The paper as a frame, drawn at a whole factor, its center opaque and repeating so its edges keep their
 * grain at any size.
 *
 * @param paper - The sprite of {@link PAPER_PATH}.
 * @param scale - The whole factor it is drawn at.
 */
export function paperFrame(paper: Sprite, scale: number): NineSlice {
    const margin = PAPER_MARGIN
    const drawn = margin * scale
    return new NineSlice(paper, { left: margin, top: margin, right: margin, bottom: margin }, {
        opaqueCenter: true,
        border: { left: drawn, top: drawn, right: drawn, bottom: drawn },
        tiling: { mirror: true },
    })
}
