import { Picture } from "./Picture.js";
import { BakedPicture } from "./BakedPicture.js";
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
export const DEFAULT_LIGHT = /** @type {[number,number]} */ ([1, 0]);
/** @type {{[name: string]: Pipeline}} */
export default {
    smooth_complete(picture, light_direction = DEFAULT_LIGHT) {
        return new BakedPicture(picture)
            .addOcclusion()
            .addShadow(light_direction)
            .addReflection(light_direction)
            .addAlphaThickness()
            .addOuterOutline(undefined, true)
            .addCastedShadow(light_direction)
            .addGloom()
            .smoothed();
    },
    smooth_no_outline(picture, light_direction = DEFAULT_LIGHT) {
        return new BakedPicture(picture)
            .addOcclusion()
            .addShadow(light_direction)
            .addReflection(light_direction)
            .addAlphaThickness()
            .addGloom()
            .smoothed();
    },
    shaded(picture, light_direction = DEFAULT_LIGHT) {
        return picture.baked()
            .addOcclusion()
            .addShadow(light_direction)
            .addReflection(light_direction)
            .addOuterOutline(undefined, true)
            .addAlphaThickness()
            .addCastedShadow(light_direction)
            .addGloom();
    },
    shaded_no_outline(picture, light_direction = DEFAULT_LIGHT) {
        return picture.baked()
            .addOcclusion()
            .addShadow(light_direction)
            .addReflection(light_direction)
            .addAlphaThickness()
            .addCastedShadow(light_direction)
            .addGloom();
    },
    color(picture) {
        return picture.baked();
    },
    depth(picture) {
        return picture.baked().makeDepthmap();
    },
    simple(picture) {
        return picture.baked().addOuterOutline().addOcclusion();
    },
};
