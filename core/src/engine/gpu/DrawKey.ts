import type { Material } from "./Material"
import type { Primitive } from "./Primitive"
import type { Texture } from "./Texture"

/**
 * How a draw is mixed with what lies under it, in premultiplied alpha:
 * - `"cutout"`: no blending, the texels of alpha below 0.5 discarded, depth written. Pixel art is almost
 *   always binary in alpha, so the order of the draws stops mattering: the depth test sorts them.
 * - `"alpha"`: drawn over, without writing depth. For what is really translucent, drawn after the rest.
 * - `"additive"`: added, without dimming what lies under it, for fire and spells. It shares the GL state of
 *   `"alpha"`, only the alpha written in the vertices, 0, tells it apart: switching between the two breaks
 *   neither a batch nor a `Model`.
 * - `"multiply"`: multiplied with what lies under it, for shadows.
 * - `"copy"`: written as is, alpha included, so a transparent texel replaces what was there. It replaces a
 *   zone of a texture without clearing it first, such as the current frame of an animated tile.
 */
export type BlendMode = "cutout"|"alpha"|"additive"|"multiply"|"copy"

/** The GL state of a blend mode: `"alpha"` and `"additive"` both draw `"over"`. */
export type BlendState = "cutout"|"over"|"multiply"|"copy"

/**
 * How the color of the vertices applies to the base color:
 * - `"modulate"`: multiplies it.
 * - `"colorize"`: multiplies its luminance, the base becoming the vertex color shaded by it: the saturation
 *   is that of the vertex color everywhere, and the luminance that of the base times that of the color.
 * - `"hue"`: gives it the hue of the vertex color, keeping its luminance and its saturation, the gap
 *   between its highest and lowest channels. A white stays white, a grey stays grey, a saturated zone takes
 *   the hue: what recolors clothes painted in one hue. A grey vertex color turns the base into its grey.
 */
export type ColorMode = "modulate"|"colorize"|"hue"

/**
 * Which fragments pass the depth test, named so that a greater `z` is nearer: `"nearer-or-equal"` draws
 * what is in front or level, `"farther"` only what is hidden, `"always"` ignores the depth.
 */
export type DepthTest = "nearer-or-equal"|"farther"|"always"

/** The GL state of a blend mode. */
export function blendStateOf(mode: BlendMode): BlendState {
    switch(mode){
        case "alpha":
        case "additive":
            return "over"
        case "cutout":
        case "multiply":
        case "copy":
            return mode
        default:
            throw new Error(`Unknown blend mode ${String(mode)}.`)
    }
}

/**
 * What fixes a draw call and stays fixed in a `Model`: a model recorded yesterday replays these values
 * with their values of yesterday. A draw whose key differs from the last one starts a new call.
 *
 * @remarks
 * Adding an option means choosing its family first: is it replayed with its value of the recording, or
 * with the current one? The former belongs here, the latter in `DrawEnvironment`. Here, it takes a field,
 * a line in `equals` and `copyFrom`, and its application by `Gpu`. `Batch`, `Model` and the model surfaces
 * never list the fields, so they do not change.
 *
 * The key works in place: the painter keeps one it changes, compared and copied field by field, so drawing
 * allocates nothing. Only a `Model` gets a copy of its own.
 */
export class DrawKey {


    constructor(
        /** The texture of the draw, read by `uTexture`. */
        public texture: Texture,

        /** The shader and the values of its uniforms, and so the layout of `aData`. */
        public material: Material,

        /** The primitive, always in its list form: a strip is converted before it enters a key. */
        public primitive: Primitive,

        public blend: BlendState = "cutout",

        public colorMode: ColorMode = "modulate",

        public depthTest: DepthTest = "nearer-or-equal",
    ){}


    /** Does the other key make the same draw call? */
    public equals(other: DrawKey): boolean {
        return this.texture === other.texture
            && this.material === other.material
            && this.primitive === other.primitive
            && this.blend === other.blend
            && this.colorMode === other.colorMode
            && this.depthTest === other.depthTest
    }

    /** Take the values of another key. */
    public copyFrom(other: DrawKey): this {
        this.texture = other.texture
        this.material = other.material
        this.primitive = other.primitive
        this.blend = other.blend
        this.colorMode = other.colorMode
        this.depthTest = other.depthTest
        return this
    }

    /** A new key with the same values. */
    public clone(): DrawKey {
        return new DrawKey(this.texture, this.material, this.primitive).copyFrom(this)
    }

    /** Does a draw with this key read the texture, as its own or through its material? */
    public reads(texture: Texture): boolean {
        return this.texture === texture || this.material.reads(texture)
    }
}
