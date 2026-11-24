/**
 * The shading recipes, headless: each one takes a `Picture` and returns the `BakedPicture` it
 * baked, WITHOUT drawing it anywhere. Call `.draw(context)` on the result to put it on a canvas
 * (that is all `rendering_modes.js` does) or `.toPixels()` to get RGBA bytes under Node.
 *
 * Extraction note: in cardgame these recipes only existed glued to a `CanvasRenderingContext2D`,
 * which made the whole shading pipeline unusable outside a browser. The recipes themselves are
 * unchanged — only the drawing has been peeled off the end.
 *
 * @typedef {(picture: Picture, light_direction?: [number,number]) => BakedPicture} Pipeline
 */
/** Where the light comes from when a caller does not care. */
export const DEFAULT_LIGHT: [number, number];
declare const _default: {
    smooth_complete(picture: Picture, light_direction?: [number, number]): BakedPicture;
    smooth_no_outline(picture: Picture, light_direction?: [number, number]): BakedPicture;
    shaded(picture: Picture, light_direction?: [number, number]): BakedPicture;
    shaded_no_outline(picture: Picture, light_direction?: [number, number]): BakedPicture;
    color(picture: Picture): BakedPicture;
    depth(picture: Picture): BakedPicture;
    simple(picture: Picture): BakedPicture;
};
export default _default;
/**
 * The shading recipes, headless: each one takes a `Picture` and returns the `BakedPicture` it
 * baked, WITHOUT drawing it anywhere. Call `.draw(context)` on the result to put it on a canvas
 * (that is all `rendering_modes.js` does) or `.toPixels()` to get RGBA bytes under Node.
 *
 * Extraction note: in cardgame these recipes only existed glued to a `CanvasRenderingContext2D`,
 * which made the whole shading pipeline unusable outside a browser. The recipes themselves are
 * unchanged — only the drawing has been peeled off the end.
 */
export type Pipeline = (picture: Picture, light_direction?: [number, number]) => BakedPicture;
import { Picture } from "./Picture.js";
import { BakedPicture } from "./BakedPicture.js";
