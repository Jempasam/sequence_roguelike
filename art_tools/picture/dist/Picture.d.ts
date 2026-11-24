import { Matrix } from "./Matrix.js";
import { BakedPicture } from "./BakedPicture.js";
export interface PictureMaterial {
    color: [number, number, number];
    alpha: number;
    light: number;
    reflection: number;
}
/**
 * A card picture information as a indexed color image with depth.
 * At least 4 different colors, more when a document asks for them (the web editor only handles 4).
 * The depth is a number between 0 and 10.
 * A depth of -1 means the pixel is fully transparent, independtly of the used color.
 */
export declare class Picture {
    readonly materials: PictureMaterial[];
    readonly width: number;
    readonly height: number;
    readonly matids: Matrix<number>;
    readonly depths: Matrix<number>;
    /**
     * Create a picture. By default the picture is entirely empty.
     * @param {PictureMaterial[]=} materials A array of 4 colors or more.
     * @param {number[]=} pixel_materials  A array of width*height indexes to the colors array.
     * @param {number[]=} pixel_depth  A array of width*height depth values.
     * @param {number=} width The width of the picture. 16 by default.
     * @param {number=} height The height of the picture. 16 by default.
     */
    readonly pixel_materials: number[];
    readonly pixel_depth: number[];
    constructor(materials?: PictureMaterial[], pixel_materials?: number[], pixel_depth?: number[], width?: number, height?: number);
    get_material_index(x: number, y: number): number;
    set_material_index(x: number, y: number, index: number): void;
    get_material(x: number, y: number): PictureMaterial;
    get_depth(x: number, y: number): number;
    set_depth(x: number, y: number, depth: number): void;
    indexes(): Generator<number[], void, unknown>;
    /**
     * Check if the pixel is inside the picture.
     */
    contains(x: number, y: number): boolean;
    /**
     * Create a new picture of three times the dimensions of this picture.
     * Mixing the colors of the pixels in a smart way.
     */
    superSampled(): Picture;
    clone(): Picture;
    baked(): BakedPicture;
}
/**
 * Create a new material that is a linear interpolation of two materials.
 */
export declare function lerpMaterial(mata: PictureMaterial, matb: PictureMaterial, ratio: number): PictureMaterial;
