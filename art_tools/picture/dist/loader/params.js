/**
 * Parameter kinds — the single description of what a value may be.
 *
 * Each kind knows two things about a parameter: how to **check and convert** it, and how to
 * **describe** it as JSON Schema. Both come from the same declaration, on purpose: a loader that
 * validates by hand and publishes a schema written separately is a loader whose schema starts
 * lying the first time someone edits one of the two.
 *
 * A kind is `{parse, schema, default, description}`. `default: undefined` means required.
 */
import { LoadError, at } from "./kit.js";
/** @typedef {{parse: (value: unknown, path: string) => any, schema: () => import('./kit.js').JsonSchema, default?: any, description?: string}} ParamKind */
/** @param {string} path @param {string} expected @param {unknown} got @returns {never} */
function refuse(path, expected, got) {
    throw new LoadError(path, `expected ${expected}, got ${JSON.stringify(got) ?? typeof got}`);
}
/**
 * A plain number, optionally bounded. Bounds are part of the schema, so an editor shows them.
 * @param {{default?: number, min?: number, max?: number, description?: string}} spec
 * @returns {ParamKind}
 */
export function number({ default: fallback, min, max, description } = {}) {
    return {
        default: fallback,
        description,
        parse(value, path) {
            if (typeof value !== "number" || !Number.isFinite(value))
                refuse(path, "a number", value);
            if (min !== undefined && value < min)
                throw new LoadError(path, `${value} is below the minimum of ${min}`);
            if (max !== undefined && value > max)
                throw new LoadError(path, `${value} is above the maximum of ${max}`);
            return value;
        },
        schema() {
            return { type: "number", ...(min !== undefined && { minimum: min }), ...(max !== undefined && { maximum: max }), ...(description && { description }) };
        },
    };
}
/**
 * @param {{default?: number, min?: number, max?: number, description?: string}} spec
 * @returns {ParamKind}
 */
export function integer({ default: fallback, min, max, description } = {}) {
    const base = number({ default: fallback, min, max, description });
    return {
        ...base,
        parse(value, path) {
            const parsed = base.parse(value, path);
            if (!Number.isInteger(parsed))
                throw new LoadError(path, `expected a whole number, got ${parsed}`);
            return parsed;
        },
        schema() { return { ...base.schema(), type: "integer" }; },
    };
}
/**
 * @param {{default?: boolean, description?: string}} spec
 * @returns {ParamKind}
 */
export function boolean({ default: fallback, description } = {}) {
    return {
        default: fallback,
        description,
        parse(value, path) {
            if (typeof value !== "boolean")
                refuse(path, "true or false", value);
            return value;
        },
        schema() { return { type: "boolean", ...(description && { description }) }; },
    };
}
/**
 * One of a fixed set of values — the schema turns it into an `enum`, which is what makes an editor
 * offer the list instead of letting you invent a name.
 * @param {readonly any[]} values
 * @param {{default?: any, description?: string}} spec
 * @returns {ParamKind}
 */
export function choice(values, { default: fallback, description } = {}) {
    return {
        default: fallback,
        description,
        parse(value, path) {
            if (!values.includes(value))
                throw new LoadError(path, `expected one of ${values.map(it => JSON.stringify(it)).join(", ")}, got ${JSON.stringify(value)}`);
            return value;
        },
        schema() { return { enum: [...values], ...(description && { description }) }; },
    };
}
/**
 * A colour, in any of the three spellings the format already accepts.
 * @param {{default?: [number,number,number], description?: string}} spec
 * @returns {ParamKind}
 */
export function color({ default: fallback, description } = {}) {
    return {
        default: fallback,
        description,
        parse(value, path) {
            if (Array.isArray(value)) {
                if (value.length !== 3 || value.some(it => typeof it !== "number"))
                    refuse(path, "[r, g, b] in 0..1", value);
                return value.map(it => Math.max(0, Math.min(1, it)));
            }
            if (typeof value !== "string")
                refuse(path, 'a colour — "#rgb", "#rrggbb" or [r, g, b]', value);
            const hex = value.replace(/^#/, "");
            const expanded = hex.length === 3 ? [...hex].map(c => c + c).join("") : hex;
            if (!/^[0-9a-fA-F]{6}$/.test(expanded))
                throw new LoadError(path, `"${value}" is not a hex colour`);
            return [0, 2, 4].map(i => parseInt(expanded.slice(i, i + 2), 16) / 255);
        },
        schema() {
            return {
                oneOf: [
                    { type: "string", pattern: "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$" },
                    { type: "array", items: { type: "number", minimum: 0, maximum: 1 }, minItems: 3, maxItems: 3 },
                ],
                ...(description && { description }),
            };
        },
    };
}
/**
 * An angle in degrees. Kept in degrees all the way to the step that uses it — the conversion to a
 * direction vector is the renderer's business, and a file that says `45` is readable where one
 * that says `[0.707, 0.707]` is not.
 * @param {{default?: number, description?: string}} spec
 * @returns {ParamKind}
 */
export function angle({ default: fallback, description } = {}) {
    return number({ default: fallback, description: description ?? "an angle in degrees" });
}
/**
 * A pair of numbers, `[x, y]`.
 * @param {{default?: [number,number], description?: string}} spec
 * @returns {ParamKind}
 */
export function vector({ default: fallback, description } = {}) {
    return {
        default: fallback,
        description,
        parse(value, path) {
            if (!Array.isArray(value) || value.length !== 2 || value.some(it => typeof it !== "number"))
                refuse(path, "[x, y]", value);
            return [value[0], value[1]];
        },
        schema() {
            return { type: "array", items: { type: "number" }, minItems: 2, maxItems: 2, ...(description && { description }) };
        },
    };
}
/**
 * A list of `[x, y]` pairs.
 * @param {{default?: [number,number][], description?: string}} spec
 * @returns {ParamKind}
 */
export function vectorList({ default: fallback, description } = {}) {
    const item = vector();
    return {
        default: fallback,
        description,
        parse(value, path) {
            if (!Array.isArray(value))
                refuse(path, "a list of [x, y] pairs", value);
            return value.map((entry, index) => item.parse(entry, at(path, `[${index}]`)));
        },
        schema() { return { type: "array", items: item.schema(), ...(description && { description }) }; },
    };
}
/**
 * A set of material indexes. Written as a list — `[0, 2]` — because that is what a set looks like;
 * the `{0: true}` shape the effects want internally is an implementation detail nobody should have
 * to type.
 * @param {{default?: {[index: number]: true}, description?: string}} spec
 * @returns {ParamKind}
 */
export function materialSet({ default: fallback, description } = {}) {
    return {
        default: fallback,
        description,
        parse(value, path) {
            if (!Array.isArray(value))
                refuse(path, "a list of material indexes, like [0, 2]", value);
            /** @type {{[index: number]: true}} */ const set = {};
            for (const [index, entry] of value.entries()) {
                if (!Number.isInteger(entry) || entry < 0 || entry > 35) {
                    throw new LoadError(at(path, `[${index}]`), `expected a material index in 0..35, got ${JSON.stringify(entry)}`);
                }
                set[entry] = true;
            }
            return set;
        },
        schema() {
            return {
                type: "array",
                items: { type: "integer", minimum: 0, maximum: 35 },
                uniqueItems: true,
                ...(description && { description }),
            };
        },
    };
}
/**
 * A number attached to each material, written as an object keyed by index: `{"0": 2, "1": 1}`.
 * @param {{default?: {[index: number]: number}, min?: number, max?: number, description?: string}} spec
 * @returns {ParamKind}
 */
export function materialWeights({ default: fallback, min, max, description } = {}) {
    const weight = number({ min, max });
    return {
        default: fallback,
        description,
        parse(value, path) {
            if (value === null || typeof value !== "object" || Array.isArray(value))
                refuse(path, 'an object keyed by material index, like {"0": 2}', value);
            /** @type {{[index: number]: number}} */ const weights = {};
            for (const [key, entry] of Object.entries(value)) {
                const index = Number(key);
                if (!Number.isInteger(index) || index < 0 || index > 35) {
                    throw new LoadError(at(path, key), `expected a material index in 0..35, got "${key}"`);
                }
                weights[index] = weight.parse(entry, at(path, key));
            }
            return weights;
        },
        schema() {
            return {
                type: "object",
                propertyNames: { enum: Array.from({ length: 36 }, (_, i) => String(i)) },
                additionalProperties: weight.schema(),
                ...(description && { description }),
            };
        },
    };
}
/**
 * A material index, or nothing. `broken` uses it: "recolour the shards with this material, or
 * leave their material alone".
 * @param {{default?: number|undefined, description?: string}} spec
 * @returns {ParamKind}
 */
export function materialIndexOrNone({ default: fallback, description } = {}) {
    return {
        default: fallback,
        description,
        parse(value, path) {
            if (value === null)
                return undefined;
            if (!Number.isInteger(value) || /** @type {number} */ (value) < 0 || /** @type {number} */ (value) > 35) {
                refuse(path, "a material index in 0..35, or null", value);
            }
            return value;
        },
        schema() {
            return { oneOf: [{ type: "integer", minimum: 0, maximum: 35 }, { type: "null" }], ...(description && { description }) };
        },
    };
}
/**
 * A whole `Loader` used as one field of a bigger one — how a document holds a palette, a pixel
 * matrix, a filter list and a render chain. The nested loader keeps reporting its own paths, so an
 * error deep inside still says `render.steps[1].light`.
 *
 * `default: null` is the spelling for "optional, and absent means nothing" — `undefined` is
 * reserved for "required", so it cannot be used for that.
 *
 * @param {import("./kit.js").Loader<any>} loader
 * @param {{default?: any, description?: string}} spec
 * @returns {ParamKind}
 */
export function nested(loader, { default: fallback, description } = {}) {
    return {
        default: fallback,
        description,
        parse(value, path) { return loader.load(value, path); },
        schema() { return { ...loader.schema(), ...(description && { description }) }; },
    };
}
/**
 * A plain string. Used for the fields that exist for an editor's benefit rather than the
 * renderer's, `$schema` chief among them.
 * @param {{default?: string, description?: string}} spec
 * @returns {ParamKind}
 */
export function text({ default: fallback, description } = {}) {
    return {
        default: fallback,
        description,
        parse(value, path) {
            if (typeof value !== "string")
                refuse(path, "a string", value);
            return value;
        },
        schema() { return { type: "string", ...(description && { description }) }; },
    };
}
/**
 * A list of strings, one per row — the shape both pixel grids use.
 * @param {{default?: any, description?: string, pattern?: string}} spec
 * @returns {ParamKind}
 */
export function rows({ default: fallback, description, pattern } = {}) {
    return {
        default: fallback,
        description,
        parse(value, path) {
            if (!Array.isArray(value) || value.length === 0 || value.some(row => typeof row !== "string")) {
                refuse(path, "a non-empty list of strings, one per row", value);
            }
            const width = value[0].length;
            if (width === 0)
                throw new LoadError(path, "rows cannot be empty");
            const wrong = value.findIndex(row => row.length !== width);
            if (wrong !== -1) {
                throw new LoadError(at(path, `[${wrong}]`), `this row is ${value[wrong].length} chars wide, expected ${width} like row 0`);
            }
            return /** @type {string[]} */ (value);
        },
        schema() {
            return {
                type: "array",
                minItems: 1,
                items: { type: "string", ...(pattern && { pattern }) },
                ...(description && { description }),
            };
        },
    };
}
