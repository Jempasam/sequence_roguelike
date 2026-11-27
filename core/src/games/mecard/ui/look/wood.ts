import type { Assets, ImagePath } from "../../../../engine/assets"
import { Atlas } from "../../../../engine/atlas"
import type { Gpu } from "../../../../engine/gpu"
import type { Color } from "../../../../engine/math"
import { NineSlice } from "../../../../engine/ui"

/** The pictures of the wood. */
const PLANK_PICTURE: ImagePath = "mecard/hud/wood_plank.png"
const FRAME_PICTURE: ImagePath = "mecard/hud/wood_frame.png"
const BLOCK_PICTURE: ImagePath = "mecard/hud/wood_block.png"
const FRAME_ACTIVE_PICTURE: ImagePath = "mecard/hud/wood_frame_active.png"
const FRAME_TRANSPARENT_PICTURE: ImagePath = "mecard/hud/wood_frame_transparent.png"

/** How many texels of a picture make a pixel of the interface: the pictures are rendered at three times their size. */
const RENDER_SCALE = 3

/** The margins of the frame and of the plank, in pixels of the interface: the corners of the frame, the wood of the plank. */
const FRAME_CORNER = 8
const FRAME_BORDER = 2 * FRAME_CORNER
const PLANK_BORDER = 5

/** How thick the wood of the frame is, the space to leave around what it holds, in pixels. */
export const FRAME_THICKNESS = 6

/** The boards of the interface: a dark frame, a nailed plank, and a tile of wood to cover a background. */
export interface Wood {
    /** A wooden frame around a dark inside. */
    readonly frame: NineSlice

    /** A wooden frame around a lighter inside, for what is selected. */
    readonly frameActive: NineSlice

    /** A wooden frame around a dark brown inside that lets what lies behind show through. */
    readonly frameTransparent: NineSlice

    /** A nailed plank, whose grain repeats. */
    readonly plank: NineSlice

    /** Wood to lay behind a screen, repeated. */
    readonly block: NineSlice

    /** The same boards, their frames in the hue of a color: the wood of a place. */
    tinted(color: Color): Wood
}

/**
 * Load the wood.
 *
 * @throws {@link AssetError} When a picture cannot be loaded.
 */
export async function loadWood(gpu: Gpu, assets: Assets): Promise<Wood> {
    const [frame, plank, block, active, transparent] = await Promise.all(
        [FRAME_PICTURE, PLANK_PICTURE, BLOCK_PICTURE, FRAME_ACTIVE_PICTURE, FRAME_TRANSPARENT_PICTURE].map(path => assets.image(path)),
    )
    const atlas = new Atlas(gpu, { initialSize: 64 })
    const entries = atlas.addAll([
        { pixels: frame }, { pixels: plank }, { pixels: block }, { pixels: active }, { pixels: transparent },
    ])
    const margins = (size: number) => ({ left: size, top: size, right: size, bottom: size })
    const cut = (index: number, corner: number, border: number, opaqueCenter = true, color?: Color) => {
        return new NineSlice(
            atlas.sprite(entries[index]), margins(corner * RENDER_SCALE),
            { opaqueCenter, tiling: {}, border: margins(border), ...color && { color, colorMode: "hue" as const } },
        )
    }
    const nailed = cut(1, PLANK_BORDER, PLANK_BORDER)
    const tile = NineSlice.withPeriod(atlas.sprite(entries[2]), margins(0), 16, { opaqueCenter: true })
    const tinted = new Map<string, Wood>()
    const woodOf = (color?: Color): Wood => ({
        frame: cut(0, FRAME_CORNER, FRAME_BORDER, true, color),
        frameActive: cut(3, FRAME_CORNER, FRAME_BORDER, true, color),
        frameTransparent: cut(4, FRAME_CORNER, FRAME_BORDER, false, color),
        plank: nailed,
        block: tile,
        tinted: other => {
            const key = `${other.r},${other.g},${other.b}`
            let wood = tinted.get(key)
            if(!wood){
                wood = woodOf(other)
                tinted.set(key, wood)
            }
            return wood
        },
    })
    return woodOf()
}
