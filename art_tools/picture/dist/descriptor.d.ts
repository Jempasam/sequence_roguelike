/**
 * Accepts "#rgb", "#rrggbb", or an [r,g,b] triple already in 0..1.
 * @param {unknown} value
 * @returns {[number,number,number]}
 */
export function parseColor(value: unknown): [number, number, number];
/**
 * Build the `Picture` a descriptor describes, before any layer has run.
 * @param {any} descriptor
 * @returns {Picture}
 */
export function parseDescriptor(descriptor: any): Picture;
/**
 * Run the `layers` of a descriptor and bake the result.
 * `overrides` is what the command line passes: it wins over what the file says.
 * @param {any} descriptor
 * @param {{pipeline?: string, effect?: string, light?: number}=} overrides
 * @returns {BakedPicture}
 */
export function renderDescriptor(descriptor: any, overrides?: {
    pipeline?: string;
    effect?: string;
    light?: number;
} | undefined): BakedPicture;
/**
 * The reverse road: turn a `Picture` back into a descriptor, so anything drawn in the editor can
 * be written out as a readable `.pic.json` and kept under version control.
 * @param {Picture} picture
 * @param {{layers?: any[]}=} extra
 */
export function toDescriptor(picture: Picture, extra?: {
    layers?: any[];
} | undefined): {
    size: number[];
    palette: {
        color: string;
        alpha: number;
        light: number;
        reflection: number;
    }[];
    pixels: {
        materials: string[];
        depth: string[];
    };
    layers: any[];
};
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
export const DEFAULT_DEPTH: 5;
import { Picture } from "./Picture.js";
import { BakedPicture } from "./BakedPicture.js";
