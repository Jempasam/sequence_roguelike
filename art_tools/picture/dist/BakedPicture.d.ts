/**
 * @typedef {import("./Picture.js").PictureMaterial&{depth:number,material_id:number,is_empty:boolean}} BakedPicturePixel
 * A matrix of whole material and depth in informations of a pictures.
 * Each pixel have its own material infos and depth.
 * Depth can have more valuer that integer between 0 and 10, instead it have a value between 0 and 1.
 */
export class BakedPicture {
    /**
     * @overload
     * Create a baked picture from a picture
     * @param {Picture} picture
     */
    constructor(picture: Picture);
    /**
     * @overload
     * Create an empty baked picture.
     * @param {number=} width The width of the picture. 16 by default.
     * @param {number=} height The height of the picture. 16 by default.
     * @param {BakedPicturePixel[]=} pixel_colors A array of 4 colors.
     */
    constructor(width?: number | undefined, height?: number | undefined, pixel_colors?: BakedPicturePixel[] | undefined);
    /** @type {BakedPicturePixel[]} */ pixel_colors: BakedPicturePixel[];
    /** @type {any[]} */ temp_data: any[];
    width: number;
    height: number;
    /**
     * Get a pixel
     * @param {number} x
     * @param {number} y
     * @returns {BakedPicturePixel}
     */
    get(x: number, y: number): BakedPicturePixel;
    /**
     * Get a pixel, if the pixel is outside the picture, return an
     * empty black pixel
     * @param {number} x
     * @param {number} y
     * @returns {BakedPicturePixel}
     */
    get_overflowing(x: number, y: number): BakedPicturePixel;
    /**
     * Get a pixel associated data or create it
     * @template T
     * @param {number} x
     * @param {number} y
     * @param {string} name
     * @param {()=>T} gen
     * @returns {T}
     */
    get_data_or<T>(x: number, y: number, name: string, gen: () => T): T;
    /**
     * Set a pixel color
     * @param {number} x
     * @param {number} y
     * @param {BakedPicturePixel} pixel_info
     */
    set(x: number, y: number, pixel_info: BakedPicturePixel): void;
    /**
     * Check if the pixel is inside the picture.
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    contains(x: number, y: number): boolean;
    /**
     * Add shadows that depends on the light direction
     * @param {[number,number]=} light_direction
     * @param {number=} light_strength
     * @param {number=} ambient
     */
    addShadow(light_direction?: [number, number] | undefined, light_strength?: number | undefined, ambient?: number | undefined): this;
    /**
     * Add reflections that depends on the light direction
     * @param {[number,number]=} light_direction
     * @param {number=} light_strength
     */
    addReflection(light_direction?: [number, number] | undefined, light_strength?: number | undefined): this;
    /**
     * Add shadows that depends on the occlusion
     * @param {number=} occlusion_strength
     */
    addOcclusion(occlusion_strength?: number | undefined): this;
    /**
     * Lower the contrast, so that an outline drawn afterwards is the only strong one. Each
     * material's average colour is pulled towards a common colour (`between`), and each pixel
     * towards its material's average (`shading`). Emissive pixels are left as they are.
     * @param {number=} between the share of the gap between materials kept: 1 unchanged, 0 all alike
     * @param {number=} shading the share of the shading within a material kept: 1 unchanged, 0 flat
     * @param {number[]|null=} towards the common colour [r,g,b] in 0..1; the picture's average when absent
     */
    reduceContrast(between?: number | undefined, shading?: number | undefined, towards?: (number[] | null) | undefined): this;
    /**
     * Tint the whole picture, as a coloured filter: every drawn pixel blended towards a colour.
     * @param {number[]} tint the colour [r,g,b] in 0..1
     * @param {number=} amount how far towards it: 0 nothing, 1 all that colour
     */
    tinted(tint: number[], amount?: number | undefined): this;
    /**
     * Change the alpha value depending on the depth to emulate a thickness
     */
    addAlphaThickness(): this;
    /**
     * Add a gloom effect around lighting materials
     */
    addGloom(strength?: number): this;
    /**
     * Add inner outlines
     * @param {number=} darkness
     * @param {boolean=} different_mat Is the outline mat different of the pixel it take its color from
     */
    addInnerOutline(darkness?: number | undefined, different_mat?: boolean | undefined): this;
    /**
     * Add outer outlines
     * @param {number=} darkness
     * @param {boolean=} different_mat Is the outline mat different of the pixel it take its color from
     */
    addOuterOutline(darkness?: number | undefined, different_mat?: boolean | undefined): this;
    /**
     * Change the color of the picture to be a depthmap
     */
    makeDepthmap(): this;
    /**
     * Add casted shadows
     * @param {[number,number]=} light_direction
     */
    addCastedShadow(light_direction?: [number, number] | undefined): this;
    /**
     * Create a smooth version of the picture
     */
    smoothed(): BakedPicture;
    /**
     * Render to straight (non-premultiplied) RGBA bytes, one texel per pixel, row-major from the
     * top-left. This is the headless twin of `draw`: same pixels, no `CanvasRenderingContext2D`,
     * so the whole pipeline runs under Node and its output can be uploaded to a GPU as-is.
     * @returns {{width:number, height:number, rgba:Uint8Array}}
     */
    toPixels(): {
        width: number;
        height: number;
        rgba: Uint8Array;
    };
    /**
     * Draw the picture on the context.
     * @param {CanvasRenderingContext2D} context
     */
    draw(context: CanvasRenderingContext2D): void;
    indexes(): Generator<number[], void, unknown>;
    clone(): BakedPicture;
}
export namespace BakedPictureUtils {
    /**
     * Get the normal of a pixel of a picture.
     * @param {BakedPicture} picture
     * @param {number} x
     * @param {number} y
     */
    function get_normal(picture: BakedPicture, x: number, y: number): number[];
    /**
     * Get the occlusion factor of a pixel of a picture.
     * @param {BakedPicture} picture
     * @param {number} x
     * @param {number} y
     */
    function get_occlusion(picture: BakedPicture, x: number, y: number): number;
    /**
     * Get the color in css format
     * @param {[number,number,number,number]} color
     */
    function get_css_color(color: [number, number, number, number]): string;
}
/**
 * A matrix of whole material and depth in informations of a pictures.
 * Each pixel have its own material infos and depth.
 * Depth can have more valuer that integer between 0 and 10, instead it have a value between 0 and 1.
 */
export type BakedPicturePixel = import("./Picture.js").PictureMaterial & {
    depth: number;
    material_id: number;
    is_empty: boolean;
};
import { Picture } from "./Picture.js";
