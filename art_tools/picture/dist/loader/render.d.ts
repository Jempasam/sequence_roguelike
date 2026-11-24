export namespace STEP_LOADERS {
    let occlusion: import("./kit.js").Loader<(baked: any) => any> & {
        id: string;
        description?: string;
    };
    let shadow: import("./kit.js").Loader<(baked: any, context: any) => any> & {
        id: string;
        description?: string;
    };
    let reflection: import("./kit.js").Loader<(baked: any, context: any) => any> & {
        id: string;
        description?: string;
    };
    let alpha_thickness: import("./kit.js").Loader<(baked: any) => any> & {
        id: string;
        description?: string;
    };
    let inner_outline: import("./kit.js").Loader<(baked: any) => any> & {
        id: string;
        description?: string;
    };
    let outer_outline: import("./kit.js").Loader<(baked: any) => any> & {
        id: string;
        description?: string;
    };
    let casted_shadow: import("./kit.js").Loader<(baked: any, context: any) => any> & {
        id: string;
        description?: string;
    };
    let tint: import("./kit.js").Loader<(baked: any) => any> & {
        id: string;
        description?: string;
    };
    let contrast: import("./kit.js").Loader<(baked: any) => any> & {
        id: string;
        description?: string;
    };
    let gloom: import("./kit.js").Loader<(baked: any) => any> & {
        id: string;
        description?: string;
    };
    let smooth: import("./kit.js").Loader<(baked: any) => any> & {
        id: string;
        description?: string;
    };
    let depthmap: import("./kit.js").Loader<(baked: any) => any> & {
        id: string;
        description?: string;
    };
}
/** A string picks a step with its defaults, `{id, ...}` picks and configures one. */
export const STEPS: import("./kit.js").Loader<(baked: any, context: any) => any> & {
    entries: {
        [id: string]: import("./kit.js").Loader<(baked: any, context: any) => any>;
    };
    ids: string[];
};
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
export const PRESETS: {
    [name: string]: (string | {
        id: string;
        [param: string]: any;
    })[];
};
/**
 * The whole chain, accepted in three spellings: a preset name, an explicit list of steps, or an
 * object naming one of those with an optional chain-wide light. `{preset: "shaded", light: 45}`
 * — reuse a recipe, move the sun — is the case this file exists for.
 * @type {import("./kit.js").Loader<(picture: import("../Picture.js").Picture) => BakedPicture>}
 */
export const RENDER: import("./kit.js").Loader<(picture: import("../Picture.js").Picture) => BakedPicture>;
/**
 * The render chain: `pipelines.js`'s six hardcoded recipes, turned into data.
 *
 * A step is a function `(baked, context) => baked`. Most `BakedPicture` verbs mutate `this` and
 * hand it back, but `smoothed()` builds a brand NEW picture at three times the size — so a step
 * always returns whatever the verb gave back, never assumes the object it started with is still
 * the one to keep using.
 */
export type RenderContext = {
    light: [number, number];
};
/**
 * The render chain: `pipelines.js`'s six hardcoded recipes, turned into data.
 *
 * A step is a function `(baked, context) => baked`. Most `BakedPicture` verbs mutate `this` and
 * hand it back, but `smoothed()` builds a brand NEW picture at three times the size — so a step
 * always returns whatever the verb gave back, never assumes the object it started with is still
 * the one to keep using.
 */
export type Step = (baked: BakedPicture, context: RenderContext) => BakedPicture;
import { BakedPicture } from "../BakedPicture.js";
