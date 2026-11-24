import type { ParamInfo } from "./engine.js";
/** Small deterministic random generator: the same seed always gives the same variants. */
export declare function mulberry32(seed: number): () => number;
/**
 * Pick a value for each slider, inside its bounds. A slider named `seed` gets a whole number, which
 * is how a sound builds its own randomness (see `sfx_rand.lib`). `fixed` parameters are left alone.
 */
export declare function randomParams(params: ParamInfo[], random: () => number, fixed?: Record<string, number>): Record<string, number>;
