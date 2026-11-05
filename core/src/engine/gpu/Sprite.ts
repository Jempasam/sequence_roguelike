import type { Texture } from "./Texture"

/** The largest texture coordinate a vertex holds, since `aUV` has 16 bits per coordinate. */
const MAX_TEXEL = 65535

/**
 * A region of a texture, and the point it is drawn from: a piece of data, an asset.
 *
 * @remarks
 * There is no color in a sprite. The tint is a state of the draw: in the sprite, making one goblin flash
 * would take a sprite per frame, or change the shared one and make every goblin flash.
 *
 * The region is in texels, so growing its texture changes nothing to it. Its corners lie on edges of
 * texels, as the corners of pixel art always do.
 */
export class Sprite {


    /**
     * @param x - The left edge of the region, in texels.
     * @param y - The top edge of the region, in texels.
     * @param originX - The point the sprite is drawn from, in texels from the top left corner of the region.
     * @throws {@link Error} When the region is not whole texels inside the texture.
     */
    constructor(
        /** The texture the region is in. */
        public readonly texture: Texture,

        public readonly x: number,
        public readonly y: number,

        /** The width of the region, in texels. */
        public readonly width: number,

        /** The height of the region, in texels. */
        public readonly height: number,

        public readonly originX = 0,
        public readonly originY = 0,
    ){
        const isWhole = [x, y, width, height].every(Number.isInteger)
        const isInside = x >= 0 && y >= 0 && width > 0 && height > 0
            && x + width <= texture.width && y + height <= texture.height
        if(!isWhole || !isInside || x + width > MAX_TEXEL || y + height > MAX_TEXEL){
            throw new Error(`The region ${width}×${height} at (${x}, ${y}) is not whole texels inside a texture`
                + ` of ${texture.width}×${texture.height}.`)
        }
    }

    /** The sprite of a whole texture, drawn from its top left corner. */
    public static whole(texture: Texture): Sprite {
        return new Sprite(texture, 0, 0, texture.width, texture.height)
    }
}
