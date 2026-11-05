import { AssetError } from "../../../../engine/assets"
import type { Assets, LayeredImagePath } from "../../../../engine/assets"
import { Texture } from "../../../../engine/gpu"
import type { Gpu } from "../../../../engine/gpu"
import { shrinkPixels } from "../../../../engine/image"
import type { OraImage } from "../../../../engine/image"

import { PNJ_LAYERS, pnjLayoutOf } from "./PnjLayout"
import type { PnjLayout } from "./PnjLayout"

/** How many times smaller than its painting a character is loaded: about the size it is shown at. */
export const PNJ_SHRINK = 4

/** A part of a character on the GPU: its pixels, how opaque it is drawn, and how much smaller they are. */
export interface PnjPart {
    readonly texture: Texture

    /** How opaque the layer is drawn, from 0 to 1. */
    readonly opacity: number
}

/**
 * What a character is drawn from: the layout of its painting, and a texture by part, made a whole number
 * of times smaller than the painting, since a painting is far larger than it is shown.
 */
export class PnjRig {


    constructor(
        public readonly layout: PnjLayout,

        /** How many pixels of the painting a texel of the textures holds, on each side. */
        public readonly shrink: number,

        public readonly body: PnjPart,
        public readonly skin: PnjPart,
        public readonly head: PnjPart,
    ){}

    /**
     * Make the rig of a character painted in an image of named layers.
     *
     * @param shrink - How many times smaller its textures are than the painting, a whole number from 1.
     * @throws {@link Error} When a part is missing from the image.
     */
    public static fromImage(gpu: Gpu, image: OraImage, shrink: number): PnjRig {
        const layout = pnjLayoutOf(image)
        const partOf = (name: string): PnjPart => {
            const layer = image.layers.find(each => each.name === name)
            if(!layer) throw new Error(`A character is painted with a layer "${name}".`)
            const texture = Texture.fromPixels(gpu, shrinkPixels(layer.pixels, shrink))
            return { texture, opacity: layer.opacity }
        }
        const { body, skin, head } = PNJ_LAYERS
        return new PnjRig(layout, shrink, partOf(body), partOf(skin), partOf(head))
    }

    /**
     * Load the rig of a character painted in an OpenRaster file.
     *
     * @param shrink - How many times smaller its textures are than the painting, a whole number from 1.
     * @throws {@link AssetError} When the file cannot be loaded, or lacks a part.
     */
    public static async load(
        gpu: Gpu, assets: Assets, path: LayeredImagePath, shrink: number,
    ): Promise<PnjRig> {
        const image = await assets.layeredImage(path)
        // Checked first, so only a part missing from the file is told as a file to fix.
        try {
            pnjLayoutOf(image)
        } catch(error){
            throw new AssetError(path, "invalid", error)
        }
        return PnjRig.fromImage(gpu, image, shrink)
    }


    /** Free its textures. */
    public dispose(): void {
        this.body.texture.dispose()
        this.skin.texture.dispose()
        this.head.texture.dispose()
    }
}
