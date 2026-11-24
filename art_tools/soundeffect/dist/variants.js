/** Small deterministic random generator: the same seed always gives the same variants. */
export function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/**
 * Pick a value for each slider, inside its bounds. A slider named `seed` gets a whole number, which
 * is how a sound builds its own randomness (see `sfx_rand.lib`). `fixed` parameters are left alone.
 */
export function randomParams(params, random, fixed = {}) {
    const out = {};
    for (const param of params) {
        if (param.name in fixed) {
            out[param.name] = fixed[param.name];
            continue;
        }
        if (param.type === "button")
            continue;
        let value = param.min + random() * (param.max - param.min);
        if (param.name === "seed")
            value = Math.floor(param.min + random() * (param.max - param.min + 1));
        else if (param.step > 0 && param.step >= (param.max - param.min) / 1000)
            value = param.min + Math.round((value - param.min) / param.step) * param.step;
        out[param.name] = Math.min(param.max, Math.max(param.min, value));
    }
    return out;
}
