/**
 * The `.pic.json` document: a palette, a matrix of pixels, an optional list of filters and a
 * render chain.
 *
 *   {
 *     "palette": [ {"color": "#c81e1e", "reflection": 0.2}, "#d9a441", ... ],
 *     "pixels": {
 *       "materials": ["..00..", ".0110."],   one char per pixel: "0".."3", "." = empty
 *       "depth":     ["..47..", ".4aa4."]    optional: "0".."9", "a" = 10, "." = empty
 *     },
 *     "filters": ["auto_depth", {"id": "drippy", "dy": 2}],
 *     "render": {"preset": "smooth_complete", "light": 135}
 *   }
 *
 * The two lists are separate, and that is the point: **filters transform the picture, then the
 * render chain shades it.** That order is not configurable, which is why they are two fields
 * rather than one ordered `layers` list — the old shape let a pipeline entry sit anywhere while
 * only the last one counted, which was a lie about how it worked.
 *
 * The size of the picture is read off the pixel rows. `size` may be stated as well, in which case
 * it is checked against them — a comment the loader keeps honest, not a source of truth.
 */
import { Picture } from "../Picture.js";
import { BakedPicture } from "../BakedPicture.js";
import { LoadError, at, recordLoader } from "./kit.js";
import * as P from "./params.js";
import { FILTER_LIST } from "./filters.js";
import { RENDER } from "./render.js";
/** The depth given to a drawn pixel when the document carries no depth grid. */
export const DEFAULT_DEPTH = 5;
const EMPTY = ".";
const WHITE = /** @type {[number,number,number]} */ ([1, 1, 1]);
const colorKind = P.color();
/**
 * One palette entry. A bare colour is the common case and gets its own spelling; the object form
 * adds the three surface properties.
 * @type {import("./kit.js").Loader<import("../Picture.js").PictureMaterial>}
 */
const MATERIAL_RECORD = recordLoader({
    title: "a material",
    params: {
        color: P.color({ default: WHITE, description: "the base colour of the material" }),
        alpha: P.number({ default: 1, min: 0, max: 1, description: "opacity, before the thickness pass thins the edges" }),
        light: P.number({ default: 0, min: 0, max: 1, description: "how much light the material emits — drives the bloom" }),
        reflection: P.number({ default: 0, min: 0, max: 1, description: "how sharply it catches a specular highlight" }),
    },
    build: values => values,
});
/** @type {import("./kit.js").Loader<import("../Picture.js").PictureMaterial>} */
export const MATERIAL = {
    load(data, path = "") {
        if (typeof data === "string" || Array.isArray(data)) {
            return { color: colorKind.parse(data, path), alpha: 1, light: 0, reflection: 0 };
        }
        return MATERIAL_RECORD.load(data, path);
    },
    schema() {
        return { title: "a material", oneOf: [colorKind.schema(), MATERIAL_RECORD.schema()] };
    },
};
/** The most materials a document may have: one character per pixel, "0".."9" then "a".."z". */
export const MAX_MATERIALS = 36;
/** The most the web editor loads. */
export const EDITOR_MATERIALS = 4;
/** The character of a material index in the pixel rows. */
export const materialChar = (/** @type {number} */ index) => index.toString(36);
/** The material index a character of the pixel rows stands for, -1 when it is none. */
const materialOf = (/** @type {string} */ char) => /^[0-9a-z]$/.test(char) ? parseInt(char, 36) : -1;
/**
 * The palette: up to `max` materials, padded with plain white up to four so a document that only
 * defines the two colours it uses still loads, and the effects that touch the first four always find them.
 * @param {number} max
 * @returns {import("./kit.js").Loader<import("../Picture.js").PictureMaterial[]>}
 */
export function paletteLoader(max) {
    return {
        load(data, path = "") {
            if (data === undefined || data === null)
                data = [];
            if (!Array.isArray(data))
                throw new LoadError(path, `expected a palette of up to ${max} materials, got ${JSON.stringify(data)}`);
            if (data.length > max)
                throw new LoadError(path, `a picture has ${max} materials at most, this palette has ${data.length}`);
            return Array.from({ length: Math.max(4, data.length) }, (_, index) => index < data.length
                ? MATERIAL.load(data[index], at(path, `[${index}]`))
                : { color: [...WHITE], alpha: 1, light: 0, reflection: 0 });
        },
        schema() {
            return { type: "array", title: "the palette", maxItems: max, items: MATERIAL.schema() };
        },
    };
}
/** The palette of a document: up to {@link MAX_MATERIALS} materials. */
export const PALETTE = paletteLoader(MAX_MATERIALS);
/** The palette the web editor loads: four materials. */
export const PALETTE_4 = paletteLoader(EDITOR_MATERIALS);
/** "0".."9" then "a" for the top of the 0..10 range; "." is the void. */
function parseDepthChar(char, path) {
    if (char === EMPTY || char === " ")
        return -1;
    if (char >= "0" && char <= "9")
        return char.charCodeAt(0) - 48;
    if (char === "a" || char === "A")
        return 10;
    throw new LoadError(path, `"${char}" is not a depth: use "0".."9", "a" for 10, or "." for empty`);
}
/**
 * The matrix of pixels. It yields the two grids rather than a `Picture`, because a picture also
 * needs a palette and the loader that has both is the document.
 * @type {import("./kit.js").Loader<{materials: string[], depth: string[]|undefined, width: number, height: number}>}
 */
/**
 * @param {number} max the most materials a row may name
 */
function pixelsLoader(max) {
    const last = materialChar(max - 1);
    return recordLoader({
        title: "the pixel matrix",
        params: {
            materials: P.rows({
                description: `one row per line, one char per pixel: "0".."${last}" picks a palette entry, "." is empty`,
                pattern: max <= 10 ? `^[0-${last}. ]*$` : `^[0-9a-${last}. ]*$`,
            }),
            depth: P.rows({
                default: null,
                description: 'optional, same shape: "0".."9", "a" for 10, "." for empty',
                pattern: "^[0-9aA. ]*$",
            }),
        },
        build: values => {
            const materials = values.materials;
            const depth = values.depth ?? undefined;
            const width = materials[0].length;
            const height = materials.length;
            if (depth !== undefined && (depth[0].length !== width || depth.length !== height)) {
                throw new LoadError("depth", `the depth grid is ${depth[0].length}x${depth.length} but the materials grid is ${width}x${height}`);
            }
            return { materials, depth, width, height };
        },
    });
}
/**
 * The matrix of pixels. It yields the two grids rather than a `Picture`, because a picture also
 * needs a palette and the loader that has both is the document.
 * @type {import("./kit.js").Loader<{materials: string[], depth: string[]|undefined, width: number, height: number}>}
 */
export const PIXELS = pixelsLoader(MAX_MATERIALS);
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
export function documentLoader(max) {
    const palette = paletteLoader(max);
    return recordLoader({
        title: "a picture document",
        description: "a palette, a matrix of pixels, the filters that transform it and the chain that shades it",
        params: {
            $schema: P.text({ default: null, description: "ignored by the loader; it is here so an editor can find the schema" }),
            size: P.vector({ default: null, description: "[width, height], checked against the rows if present" }),
            palette: P.nested(palette, { default: null }),
            pixels: P.nested(pixelsLoader(max)),
            filters: P.nested(FILTER_LIST, { default: null, description: "applied in order, before the picture is shaded" }),
            render: P.nested(RENDER, { default: null, description: "the shading chain; smooth_complete when absent" }),
        },
        build: values => {
            const { materials: materialRows, depth: depthRows, width, height } = values.pixels;
            const materials = values.palette ?? palette.load([]);
            if (values.size !== null && (values.size[0] !== width || values.size[1] !== height)) {
                throw new LoadError("size", `says ${values.size[0]}x${values.size[1]} but the rows are ${width}x${height}`);
            }
            const picture = new Picture(materials, undefined, undefined, width, height);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const char = materialRows[y][x];
                    if (char === EMPTY || char === " ")
                        continue;
                    // `set_material_index` clamps, so an out-of-range char would silently become
                    // the last material instead of being reported.
                    const index = materialOf(char);
                    if (index < 0 || index >= materials.length) {
                        throw new LoadError(`pixels.materials[${y}]`, `"${char}" at column ${x} is not a material: the palette has ${materials.length}, use "0".."${materialChar(materials.length - 1)}" or "." for empty`);
                    }
                    const depth = depthRows === undefined
                        ? DEFAULT_DEPTH
                        : parseDepthChar(depthRows[y][x], `pixels.depth[${y}]`);
                    if (depth === -1)
                        continue;
                    picture.set_material_index(x, y, index);
                    picture.set_depth(x, y, depth);
                }
            }
            return {
                picture,
                filters: values.filters ?? [],
                render: values.render ?? RENDER.load("smooth_complete"),
            };
        },
    });
}
/** The document of a picture file: up to {@link MAX_MATERIALS} materials. */
export const DOCUMENT = documentLoader(MAX_MATERIALS);
/** The document the web editor loads: four materials, as its panels have. */
export const DOCUMENT_4 = documentLoader(EDITOR_MATERIALS);
/**
 * Run a document: every filter in order, then the render chain.
 * @param {PictureDocument} document
 * @returns {BakedPicture}
 */
export function renderDocument(document) {
    let picture = document.picture;
    for (const filter of document.filters)
        picture = filter(picture);
    return document.render(picture);
}
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
export function withOverrides(raw, overrides) {
    const document = { ...raw };
    if (overrides.render !== undefined)
        document.render = overrides.render;
    if (overrides.filters !== undefined)
        document.filters = overrides.filters;
    if (overrides.effect !== undefined) {
        const existing = document.filters === undefined || document.filters === null
            ? []
            : Array.isArray(document.filters) ? document.filters : [document.filters];
        document.filters = [...existing, overrides.effect];
    }
    if (overrides.light !== undefined) {
        // The light belongs to the chain, so setting it means rewriting the chain around whatever
        // spelling the document happened to use.
        const chain = document.render;
        if (chain === undefined || chain === null)
            document.render = { preset: "smooth_complete", light: overrides.light };
        else if (typeof chain === "string")
            document.render = { preset: chain, light: overrides.light };
        else if (Array.isArray(chain))
            document.render = { steps: chain, light: overrides.light };
        else
            document.render = { ...chain, light: overrides.light };
    }
    return document;
}
/**
 * The road back: a `Picture` written out as a document, so anything drawn in the editor can be
 * kept as readable text under version control.
 * @param {Picture} picture
 * @param {{filters?: any, render?: any, used?: Picture}=} extra `used`: the picture whose pixels decide which trailing palette entries are dropped (default: `picture`)
 */
export function toDocument(picture, extra = {}) {
    const materials = [];
    const depth = [];
    for (let y = 0; y < picture.height; y++) {
        let materialRow = "";
        let depthRow = "";
        for (let x = 0; x < picture.width; x++) {
            const pixelDepth = picture.get_depth(x, y);
            if (pixelDepth === -1) {
                materialRow += EMPTY;
                depthRow += EMPTY;
            }
            else {
                materialRow += materialChar(picture.get_material_index(x, y));
                depthRow += pixelDepth === 10 ? "a" : String(pixelDepth);
            }
        }
        materials.push(materialRow);
        depth.push(depthRow);
    }
    const hex = (/** @type {number[]} */ color) => "#" + color.map(it => Math.round(Math.max(0, Math.min(1, it)) * 255).toString(16).padStart(2, "0")).join("");
    // A material is kept if it, or a later one, is drawn: the position is the id, so only the
    // trailing unused ones can go. `extra.used` is the picture to scan — filters can create pixels of
    // a material the drawing does not use, so the editor passes the picture *after* its filters.
    const scanned = extra.used ?? picture;
    let last = -1;
    for (let y = 0; y < scanned.height; y++) {
        for (let x = 0; x < scanned.width; x++) {
            if (scanned.get_depth(x, y) !== -1)
                last = Math.max(last, scanned.get_material_index(x, y));
        }
    }
    // Only what the loader would not find by itself is written: a bare colour when the surface
    // properties are the defaults, else the colour and the properties that differ.
    const palette = picture.materials.slice(0, last + 1).map(material => {
        const entry = /** @type {{[key: string]: any}} */ ({ color: hex(material.color) });
        if (material.alpha !== 1)
            entry.alpha = material.alpha;
        if (material.light !== 0)
            entry.light = material.light;
        if (material.reflection !== 0)
            entry.reflection = material.reflection;
        return Object.keys(entry).length === 1 ? entry.color : entry;
    });
    // The size is the rows' own; the depth grid is the loader's default unless a pixel departs from it.
    let customDepth = false;
    for (let y = 0; y < picture.height; y++) {
        for (let x = 0; x < picture.width; x++) {
            const pixelDepth = picture.get_depth(x, y);
            if (pixelDepth !== -1 && pixelDepth !== DEFAULT_DEPTH)
                customDepth = true;
        }
    }
    return {
        ...(palette.length > 0 && { palette }),
        pixels: customDepth ? { materials, depth } : { materials },
        ...(extra.filters !== undefined && { filters: extra.filters }),
        ...(extra.render !== undefined && extra.render !== "smooth_complete" && { render: extra.render }),
    };
}
