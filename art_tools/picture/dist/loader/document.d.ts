/**
 * The palette: up to `max` materials, padded with plain white up to four so a document that only
 * defines the two colours it uses still loads, and the effects that touch the first four always find them.
 * @param {number} max
 * @returns {import("./kit.js").Loader<import("../Picture.js").PictureMaterial[]>}
 */
export function paletteLoader(max: number): import("./kit.js").Loader<import("../Picture.js").PictureMaterial[]>;
/**
 * @typedef {object} PictureDocument
 * @property {Picture} picture the drawing, before any filter has run
 * @property {((picture: Picture) => Picture)[]} filters applied in order, before shading
 * @property {(picture: Picture) => BakedPicture} render the shading chain
 */
/**
 * A document loader taking up to `max` materials.
 * @param {number} max
 * @returns {import("./kit.js").Loader<PictureDocument>}
 */
export function documentLoader(max: number): import("./kit.js").Loader<PictureDocument>;
/**
 * Run a document: every filter in order, then the render chain.
 * @param {PictureDocument} document
 * @returns {BakedPicture}
 */
export function renderDocument(document: PictureDocument): BakedPicture;
/**
 * Apply command-line (or plugin) overrides to a document **before** it is loaded — data in, data
 * out. Doing it here rather than after loading is what keeps every error message in the document's
 * own vocabulary: an override that makes no sense fails saying `render.light`, exactly as it would
 * if the file had said it.
 *
 * `render` and `filters` replace; `effect` appends one filter to whatever is already there, which
 * is the difference between "render it this other way" and "and also make it look burnt".
 *
 * @param {any} raw the parsed `.pic.json`, untouched
 * @param {{render?: unknown, filters?: unknown, effect?: unknown, light?: number}} overrides
 * @returns {any} a new raw document; the input is not modified
 */
export function withOverrides(raw: any, overrides: {
    render?: unknown;
    filters?: unknown;
    effect?: unknown;
    light?: number;
}): any;
/**
 * The road back: a `Picture` written out as a document, so anything drawn in the editor can be
 * kept as readable text under version control.
 * @param {Picture} picture
 * @param {{filters?: any, render?: any, used?: Picture}=} extra `used`: the picture whose pixels decide which trailing palette entries are dropped (default: `picture`)
 */
export function toDocument(picture: Picture, extra?: {
    filters?: any;
    render?: any;
    used?: Picture;
} | undefined): {
    render: any;
    filters: any;
    pixels: {
        materials: string[];
        depth: string[];
    } | {
        materials: string[];
        depth?: undefined;
    };
    palette: any[];
};
/** The depth given to a drawn pixel when the document carries no depth grid. */
export const DEFAULT_DEPTH: 5;
/** @type {import("./kit.js").Loader<import("../Picture.js").PictureMaterial>} */
export const MATERIAL: import("./kit.js").Loader<import("../Picture.js").PictureMaterial>;
/** The most materials a document may have: one character per pixel, "0".."9" then "a".."z". */
export const MAX_MATERIALS: 36;
/** The most the web editor loads. */
export const EDITOR_MATERIALS: 4;
export function materialChar(index: number): string;
/** The palette of a document: up to {@link MAX_MATERIALS} materials. */
export const PALETTE: import("./kit.js").Loader<import("../Picture.js").PictureMaterial[]>;
/** The palette the web editor loads: four materials. */
export const PALETTE_4: import("./kit.js").Loader<import("../Picture.js").PictureMaterial[]>;
/**
 * The matrix of pixels. It yields the two grids rather than a `Picture`, because a picture also
 * needs a palette and the loader that has both is the document.
 * @type {import("./kit.js").Loader<{materials: string[], depth: string[]|undefined, width: number, height: number}>}
 */
export const PIXELS: import("./kit.js").Loader<{
    materials: string[];
    depth: string[] | undefined;
    width: number;
    height: number;
}>;
/** The document of a picture file: up to {@link MAX_MATERIALS} materials. */
export const DOCUMENT: import("./kit.js").Loader<PictureDocument>;
/** The document the web editor loads: four materials, as its panels have. */
export const DOCUMENT_4: import("./kit.js").Loader<PictureDocument>;
export type PictureDocument = {
    /**
     * the drawing, before any filter has run
     */
    picture: Picture;
    /**
     * applied in order, before shading
     */
    filters: ((picture: Picture) => Picture)[];
    /**
     * the shading chain
     */
    render: (picture: Picture) => BakedPicture;
};
import { BakedPicture } from "../BakedPicture.js";
import { Picture } from "../Picture.js";
