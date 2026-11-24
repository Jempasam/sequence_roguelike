import { objectLoader, registryLoader, listLoader, LoadError, at } from "./kit.js";
import { number, boolean, angle, color } from "./params.js";
import { BakedPicture } from "../BakedPicture.js";
/**
 * The render chain: `pipelines.js`'s six hardcoded recipes, turned into data.
 *
 * A step is a function `(baked, context) => baked`. Most `BakedPicture` verbs mutate `this` and
 * hand it back, but `smoothed()` builds a brand NEW picture at three times the size — so a step
 * always returns whatever the verb gave back, never assumes the object it started with is still
 * the one to keep using.
 *
 * @typedef {{light: [number, number]}} RenderContext
 * @typedef {(baked: BakedPicture, context: RenderContext) => BakedPicture} Step
 */
/**
 * Degrees to a unit direction — the same formula the editor (`picture_editor.js`) and the
 * descriptor (`descriptor.js`) already use for the same purpose. Keeping it identical here is
 * what makes a saved angle render the same picture everywhere it is read.
 * @param {number} degrees
 * @returns {[number, number]}
 */
function direction(degrees) {
    const radians = degrees * Math.PI / 180;
    return [Math.cos(radians), Math.sin(radians)];
}
/** The chain-wide light, kept as one instance so its schema and its parsing cannot drift apart. */
const LIGHT = angle({ description: "The chain's light direction in degrees; 0 is east. Steps that don't set their own light fall back to this." });
/**
 * A step's own light override. `objectLoader` requires a defined `default` to make a parameter
 * optional — but the meaning wanted here is "absent, use the chain's", not "some particular
 * angle". `null` stands in for that: `parse` only ever runs on a key actually present in the
 * data, so a real angle value can never collide with the sentinel.
 * @param {string} description
 * @returns {import("./params.js").ParamKind}
 */
function stepLight(description) {
    return { ...angle({ description }), default: null };
}
/**
 * A step's own light if it set one, otherwise the chain's — already a direction vector either way.
 * @param {any} values
 * @param {RenderContext} context
 * @returns {[number, number]}
 */
function resolveLight(values, context) {
    // Loose on purpose: "no light of my own" arrives as `null` from the declared default and as
    // `undefined` from a caller that passes no values at all.
    return values.light == null ? context.light : direction(values.light);
}
/** One `objectLoader` per `BakedPicture` verb. */
export const STEP_LOADERS = {
    occlusion: objectLoader({
        id: "occlusion",
        description: "Darkens creases and hollows using ambient occlusion computed from the depth map.",
        params: {
            occlusion_strength: number({ default: 1, description: "How strongly the occlusion darkens; 0 turns the effect off." }),
        },
        build: (values) => (baked) => baked.addOcclusion(values.occlusion_strength),
    }),
    shadow: objectLoader({
        id: "shadow",
        description: "Shades each pixel by how its surface normal faces the light, with an ambient floor so nothing goes fully black.",
        params: {
            light: stepLight("This step's own light direction, in degrees; omit to use the chain's."),
            light_strength: number({ default: 1.5, description: "How strongly the surface normal responds to the light direction." }),
            ambient: number({ default: 0.3, description: "The light level a pixel keeps even when it faces away from the light." }),
        },
        build: (values) => (baked, context) => baked.addShadow(resolveLight(values, context), values.light_strength, values.ambient),
    }),
    reflection: objectLoader({
        id: "reflection",
        description: "Adds a specular highlight on pixels marked reflective, brightest where the surface faces the light directly.",
        params: {
            light: stepLight("This step's own light direction, in degrees; omit to use the chain's."),
            // `addReflection` takes a `light_strength` second argument, but its body never reads
            // it. It is deliberately NOT exposed: a parameter published in the schema is one an
            // editor offers and a reader believes, and this one would do nothing. Expose it the
            // day the verb starts using it.
        },
        build: (values) => (baked, context) => baked.addReflection(resolveLight(values, context)),
    }),
    alpha_thickness: objectLoader({
        id: "alpha_thickness",
        description: "Thins the alpha of deep pixels and thickens shallow ones, so depth reads as translucency.",
        build: () => (baked) => baked.addAlphaThickness(),
    }),
    inner_outline: objectLoader({
        id: "inner_outline",
        description: "Darkens the pixels on the inside edge of the shape, wherever a pixel sits next to an empty neighbor.",
        params: {
            darkness: number({ default: 0.3, description: "Multiplier on the outline pixel's color — lower is darker, 1 leaves it unchanged." }),
            different_mat: boolean({ default: false, description: "Give outline pixels a synthetic material id instead of keeping the one they were shaded from." }),
        },
        build: (values) => (baked) => baked.addInnerOutline(values.darkness, values.different_mat),
    }),
    outer_outline: objectLoader({
        id: "outer_outline",
        description: "Paints a new ring of pixels just outside the shape, colored from nearby pixels' average and dimmed.",
        params: {
            darkness: number({ default: 0.3, description: "Multiplier on the outline pixel's color — lower is darker, 1 leaves it unchanged." }),
            different_mat: boolean({ default: false, description: "Give outline pixels a synthetic material id instead of keeping the one they were shaded from." }),
        },
        build: (values) => (baked) => baked.addOuterOutline(values.darkness, values.different_mat),
    }),
    casted_shadow: objectLoader({
        id: "casted_shadow",
        description: "Drops a soft shadow onto the empty pixels just behind the shape, offset opposite the light.",
        params: {
            light: stepLight("This step's own light direction, in degrees; omit to use the chain's."),
        },
        build: (values) => (baked, context) => baked.addCastedShadow(resolveLight(values, context)),
    }),
    tint: objectLoader({
        id: "tint",
        description: "A coloured filter: blends every drawn pixel, outline and cast shadow included, towards a colour. Put it last.",
        params: {
            color: color({ default: [1, 0, 0], description: "The colour of the filter." }),
            amount: number({ default: 0.1, min: 0, max: 1, description: "How far towards it: 0 nothing, 1 all that colour." }),
        },
        build: (values) => (baked) => baked.tinted(values.color, values.amount),
    }),
    contrast: objectLoader({
        id: "contrast",
        description: "Lowers the contrast: pulls each material's average colour towards a common colour, and optionally each pixel towards its material's average; emissive pixels aside. Put it before outer_outline so the outline stays the strong contrast.",
        params: {
            between: number({ default: 0.5, min: 0, max: 1, description: "The share of the gap between materials kept: 1 leaves it unchanged, 0 makes every material alike." }),
            shading: number({ default: 1, min: 0, max: 1, description: "The share of the shading within a material kept: 1 leaves it unchanged, 0 flattens each material to one tone." }),
            towards: color({ default: null, description: "The common colour the materials are pulled towards; the picture's average colour when absent. Give the same one to pictures meant to be seen together." }),
        },
        build: (values) => (baked) => baked.reduceContrast(values.between, values.shading, values.towards),
    }),
    gloom: objectLoader({
        id: "gloom",
        description: "Bleeds the color of glowing (emissive) pixels into their neighbors, brightest close up.",
        params: {
            strength: number({ default: 0.5, description: "How strongly glow bleeds into neighboring pixels." }),
        },
        build: (values) => (baked) => baked.addGloom(values.strength),
    }),
    // Every other verb mutates and returns `this`; this one returns a NEW picture at 3x the
    // dimensions, which is why a `Step` must always be treated as returning its result, not as
    // mutating its input in place.
    smooth: objectLoader({
        id: "smooth",
        description: "Supersamples the picture to three times its width and height, blending matching materials across corners.",
        build: () => (baked) => baked.smoothed(),
    }),
    depthmap: objectLoader({
        id: "depthmap",
        description: "Replaces every pixel's color with its depth, as a grayscale value.",
        build: () => (baked) => baked.makeDepthmap(),
    }),
};
/** A string picks a step with its defaults, `{id, ...}` picks and configures one. */
export const STEPS = registryLoader({ what: "step", entries: STEP_LOADERS });
const STEP_LIST = listLoader(STEPS, { what: "step" });
/**
 * The six recipes of `pipelines.js`, as data.
 *
 * `shaded` and `smooth_complete` read as the same recipe but are not: `smooth_complete` thins
 * the alpha before it cuts the outer outline, `shaded` cuts the outline first. `addOuterOutline`
 * reads whatever colors and alpha exist in the picture at the moment it runs, so that reordering
 * changes the pixels. Both put `casted_shadow` after `alpha_thickness` — `addCastedShadow` reads
 * the neighboring pixel's alpha to decide how dark the cast shadow is, so it needs that step done
 * first.
 * @type {{[name: string]: (string | {id: string, [param: string]: any})[]}}
 */
export const PRESETS = {
    smooth_complete: [
        "occlusion",
        "shadow",
        "reflection",
        "alpha_thickness",
        { id: "outer_outline", different_mat: true },
        "casted_shadow",
        "gloom",
        "smooth",
    ],
    smooth_no_outline: [
        "occlusion",
        "shadow",
        "reflection",
        "alpha_thickness",
        "gloom",
        "smooth",
    ],
    shaded: [
        "occlusion",
        "shadow",
        "reflection",
        { id: "outer_outline", different_mat: true },
        "alpha_thickness",
        "casted_shadow",
        "gloom",
    ],
    shaded_no_outline: [
        "occlusion",
        "shadow",
        "reflection",
        "alpha_thickness",
        "casted_shadow",
        "gloom",
    ],
    color: [],
    depth: ["depthmap"],
    simple: ["outer_outline", "occlusion"],
};
/**
 * @param {unknown} name
 * @param {string} path
 * @returns {Step[]}
 */
function loadPreset(name, path) {
    if (typeof name !== "string")
        throw new LoadError(path, `expected a preset name, got ${JSON.stringify(name)}`);
    const preset = PRESETS[name];
    if (!preset)
        throw new LoadError(path, `unknown preset "${name}" — known presets: ${Object.keys(PRESETS).join(", ")}`);
    return STEP_LIST.load(preset, path);
}
/**
 * @param {Step[]} steps
 * @param {number} lightDegrees
 * @returns {(picture: import("../Picture.js").Picture) => BakedPicture}
 */
function chain(steps, lightDegrees) {
    return (picture) => {
        const context = { light: direction(lightDegrees) };
        let baked = new BakedPicture(picture);
        for (const step of steps)
            baked = step(baked, context);
        return baked;
    };
}
const CHAIN_KEYS = ["preset", "steps", "light"];
/**
 * The whole chain, accepted in three spellings: a preset name, an explicit list of steps, or an
 * object naming one of those with an optional chain-wide light. `{preset: "shaded", light: 45}`
 * — reuse a recipe, move the sun — is the case this file exists for.
 * @type {import("./kit.js").Loader<(picture: import("../Picture.js").Picture) => BakedPicture>}
 */
export const RENDER = {
    load(data, path = "") {
        if (typeof data === "string")
            return chain(loadPreset(data, path), 0);
        if (Array.isArray(data))
            return chain(STEP_LIST.load(data, path), 0);
        if (data === null || typeof data !== "object") {
            throw new LoadError(path, `expected a preset name, a list of steps, or {preset, steps, light}, got ${JSON.stringify(data)}`);
        }
        /** @type {{[key: string]: unknown}} */ const raw = /** @type {any} */ (data);
        for (const key of Object.keys(raw)) {
            if (!CHAIN_KEYS.includes(key))
                throw new LoadError(at(path, key), `a render chain has no such option (it takes: ${CHAIN_KEYS.join(", ")})`);
        }
        const hasPreset = raw.preset !== undefined;
        const hasSteps = raw.steps !== undefined;
        if (hasPreset && hasSteps)
            throw new LoadError(path, `a render chain takes either "preset" or "steps", not both`);
        if (!hasPreset && !hasSteps)
            throw new LoadError(path, `a render chain needs a "preset" or "steps"`);
        const lightDegrees = raw.light !== undefined ? LIGHT.parse(raw.light, at(path, "light")) : 0;
        const steps = hasPreset ? loadPreset(raw.preset, at(path, "preset")) : STEP_LIST.load(raw.steps, at(path, "steps"));
        return chain(steps, lightDegrees);
    },
    schema() {
        const presetNames = Object.keys(PRESETS);
        return {
            title: "render chain",
            oneOf: [
                { type: "string", enum: presetNames, description: "a preset name; light defaults to 0 degrees (east)" },
                STEP_LIST.schema(),
                {
                    type: "object",
                    description: "a preset or explicit steps, with an optional chain-wide light",
                    properties: {
                        preset: { type: "string", enum: presetNames },
                        steps: STEP_LIST.schema(),
                        light: LIGHT.schema(),
                    },
                    additionalProperties: false,
                },
            ],
        };
    },
};
