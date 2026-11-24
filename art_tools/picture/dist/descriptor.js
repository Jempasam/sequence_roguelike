import { Picture } from "./Picture.js";
import effects from "./effects.js";
import pipelines from "./pipelines.js";
import { BakedPicture } from "./BakedPicture.js";
/**
 * A picture written as a readable JSON document — a `.pic.json` file — instead of the three flat
 * arrays of numbers `shapes.json` holds. That triple is what the editor happens to serialise, not
 * something a human (or a program) can author by hand. A descriptor has the three parts you
 * actually think in:
 *
 *   {
 *     "palette": [ {"color": "#c81e1e", "alpha": 1, "light": 0, "reflection": 0.2}, ... ],
 *     "pixels": {
 *       "materials": ["..00..", ".0110.", ...],   one char per pixel: "0".."3", "." = empty
 *       "depth":     ["..47..", ".4aa4.", ...]    optional: "0".."9", "a" = 10, "." = empty
 *     },
 *     "layers": [ {"effect": "auto_depth"}, {"pipeline": "smooth_complete", "light": 45} ]
 *   }
 *
 * `size` is read off the rows. `depth` may be omitted (every drawn pixel gets DEFAULT_DEPTH, and
 * an `auto_depth` layer usually does a better job than a hand-written grid). `layers` runs in
 * order: every `effect` entry transforms the picture, and the `pipeline` entry bakes it — if none
 * is given, `smooth_complete` closes the chain.
 *
 * This module is pure: no fs, no canvas, no node. The CLI and the Vite plugin both go through it.
 */
/** The depth given to a drawn pixel when the descriptor carries no depth grid. */
export const DEFAULT_DEPTH = 5;
const EMPTY = ".";
const DEFAULT_MATERIAL = /** @type {import("./Picture.js").PictureMaterial} */ ({ color: [1, 1, 1], alpha: 1, light: 0, reflection: 0 });
/** @param {string} message @returns {never} */
function reject(message) {
    throw new Error(`invalid picture descriptor: ${message}`);
}
/**
 * Accepts "#rgb", "#rrggbb", or an [r,g,b] triple already in 0..1.
 * @param {unknown} value
 * @returns {[number,number,number]}
 */
export function parseColor(value) {
    if (Array.isArray(value)) {
        if (value.length !== 3 || value.some(it => typeof it !== "number"))
            reject(`a colour array must be [r,g,b] in 0..1, got ${JSON.stringify(value)}`);
        return /** @type {[number,number,number]} */ (value.map(it => Math.max(0, Math.min(1, it))));
    }
    if (typeof value !== "string")
        reject(`a colour must be "#rrggbb" or [r,g,b], got ${JSON.stringify(value)}`);
    const hex = /** @type {string} */ (value).replace(/^#/, "");
    const expanded = hex.length === 3 ? [...hex].map(c => c + c).join("") : hex;
    if (!/^[0-9a-fA-F]{6}$/.test(expanded))
        reject(`"${value}" is not a hex colour`);
    return /** @type {[number,number,number]} */ ([0, 2, 4].map(i => parseInt(expanded.slice(i, i + 2), 16) / 255));
}
/**
 * @param {any} entry
 * @returns {import("./Picture.js").PictureMaterial}
 */
function parseMaterial(entry) {
    if (entry === null || entry === undefined)
        return structuredClone(DEFAULT_MATERIAL);
    if (typeof entry === "string")
        return { ...structuredClone(DEFAULT_MATERIAL), color: parseColor(entry) };
    if (typeof entry !== "object")
        reject(`a palette entry must be a colour or an object, got ${JSON.stringify(entry)}`);
    const number = (/** @type {any} */ value, /** @type {number} */ fallback) => {
        if (value === undefined)
            return fallback;
        if (typeof value !== "number")
            reject(`expected a number, got ${JSON.stringify(value)}`);
        return Math.max(0, Math.min(1, value));
    };
    return {
        color: entry.color === undefined ? /** @type {[number,number,number]} */ ([1, 1, 1]) : parseColor(entry.color),
        alpha: number(entry.alpha, 1),
        light: number(entry.light, 0),
        reflection: number(entry.reflection, 0),
    };
}
/** "0".."9" then "a" for the top of the 0..10 range; "." is the void. @param {string} char */
function parseDepthChar(char) {
    if (char === EMPTY || char === " ")
        return -1;
    if (char >= "0" && char <= "9")
        return char.charCodeAt(0) - 48;
    if (char === "a" || char === "A")
        return 10;
    return reject(`"${char}" is not a depth: use "0".."9", "a" for 10, or "." for empty`);
}
/** @param {unknown} rows @param {string} field */
function checkRows(rows, field) {
    if (!Array.isArray(rows) || rows.length === 0 || rows.some(row => typeof row !== "string")) {
        reject(`${field} must be a non-empty array of strings, one per row`);
    }
    const list = /** @type {string[]} */ (rows);
    const width = list[0].length;
    if (width === 0)
        reject(`${field} rows cannot be empty`);
    const wrong = list.findIndex(row => row.length !== width);
    if (wrong !== -1)
        reject(`${field} row ${wrong} is ${list[wrong].length} chars wide, expected ${width} like row 0`);
    return width;
}
/**
 * Build the `Picture` a descriptor describes, before any layer has run.
 * @param {any} descriptor
 * @returns {Picture}
 */
export function parseDescriptor(descriptor) {
    if (descriptor === null || typeof descriptor !== "object")
        reject("expected a JSON object");
    const pixels = descriptor.pixels;
    if (pixels === null || typeof pixels !== "object")
        reject('missing "pixels"');
    const materialRows = pixels.materials;
    const width = checkRows(materialRows, "pixels.materials");
    const height = materialRows.length;
    const depthRows = pixels.depth;
    if (depthRows !== undefined) {
        const depthWidth = checkRows(depthRows, "pixels.depth");
        if (depthWidth !== width || depthRows.length !== height) {
            reject(`pixels.depth is ${depthWidth}x${depthRows.length} but pixels.materials is ${width}x${height}`);
        }
    }
    if (descriptor.size !== undefined) {
        const size = descriptor.size;
        if (!Array.isArray(size) || size.length !== 2)
            reject('"size" must be [width, height]');
        if (size[0] !== width || size[1] !== height) {
            reject(`"size" says ${size[0]}x${size[1]} but the rows are ${width}x${height}`);
        }
    }
    const palette = descriptor.palette ?? [];
    if (!Array.isArray(palette))
        reject('"palette" must be an array of at most 4 materials');
    if (palette.length > 4)
        reject(`a picture has 4 materials at most, "palette" has ${palette.length}`);
    const materials = Array.from({ length: 4 }, (_, i) => parseMaterial(palette[i]));
    const picture = new Picture(materials, undefined, undefined, width, height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const char = materialRows[y][x];
            if (char === EMPTY || char === " ")
                continue;
            if (char < "0" || char > "3")
                reject(`"${char}" at row ${y}, column ${x} is not a material: use "0".."3" or "." for empty`);
            const depth = depthRows === undefined ? DEFAULT_DEPTH : parseDepthChar(depthRows[y][x]);
            if (depth === -1)
                continue;
            picture.set_material_index(x, y, char.charCodeAt(0) - 48);
            picture.set_depth(x, y, depth);
        }
    }
    return picture;
}
/**
 * Run the `layers` of a descriptor and bake the result.
 * `overrides` is what the command line passes: it wins over what the file says.
 * @param {any} descriptor
 * @param {{pipeline?: string, effect?: string, light?: number}=} overrides
 * @returns {BakedPicture}
 */
export function renderDescriptor(descriptor, overrides = {}) {
    let picture = parseDescriptor(descriptor);
    const layers = descriptor.layers ?? [];
    if (!Array.isArray(layers))
        reject('"layers" must be an array');
    let pipelineName = "smooth_complete";
    let lightDegrees = 0;
    for (const [index, layer] of layers.entries()) {
        if (layer === null || typeof layer !== "object")
            reject(`layer ${index} must be an object`);
        if (layer.effect !== undefined) {
            const effect = effects[layer.effect];
            if (!effect)
                reject(`layer ${index}: unknown effect "${layer.effect}"`);
            const args = layer.args ?? [];
            if (!Array.isArray(args))
                reject(`layer ${index}: "args" must be an array`);
            picture = effect(picture, ...args);
            if (!(picture instanceof Picture))
                reject(`layer ${index}: effect "${layer.effect}" did not return a picture`);
        }
        else if (layer.pipeline !== undefined) {
            if (!pipelines[layer.pipeline])
                reject(`layer ${index}: unknown pipeline "${layer.pipeline}"`);
            pipelineName = layer.pipeline;
            if (layer.light !== undefined) {
                if (typeof layer.light !== "number")
                    reject(`layer ${index}: "light" is an angle in degrees`);
                lightDegrees = layer.light;
            }
        }
        else
            reject(`layer ${index} must carry either "effect" or "pipeline"`);
    }
    if (overrides.effect !== undefined) {
        const effect = effects[overrides.effect];
        if (!effect)
            reject(`unknown effect "${overrides.effect}"`);
        picture = effect(picture);
    }
    if (overrides.pipeline !== undefined) {
        if (!pipelines[overrides.pipeline])
            reject(`unknown pipeline "${overrides.pipeline}"`);
        pipelineName = overrides.pipeline;
    }
    if (overrides.light !== undefined)
        lightDegrees = overrides.light;
    const angle = lightDegrees * Math.PI / 180;
    return pipelines[pipelineName](picture, [Math.cos(angle), Math.sin(angle)]);
}
/**
 * The reverse road: turn a `Picture` back into a descriptor, so anything drawn in the editor can
 * be written out as a readable `.pic.json` and kept under version control.
 * @param {Picture} picture
 * @param {{layers?: any[]}=} extra
 */
export function toDescriptor(picture, extra = {}) {
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
                materialRow += String(picture.get_material_index(x, y));
                depthRow += pixelDepth === 10 ? "a" : String(pixelDepth);
            }
        }
        materials.push(materialRow);
        depth.push(depthRow);
    }
    const hex = (/** @type {number[]} */ color) => "#" + color.map(it => Math.round(Math.max(0, Math.min(1, it)) * 255).toString(16).padStart(2, "0")).join("");
    return {
        size: [picture.width, picture.height],
        palette: picture.materials.map(material => ({
            color: hex(material.color),
            alpha: material.alpha,
            light: material.light,
            reflection: material.reflection,
        })),
        pixels: { materials, depth },
        layers: extra.layers ?? [{ pipeline: "smooth_complete", light: 0 }],
    };
}
