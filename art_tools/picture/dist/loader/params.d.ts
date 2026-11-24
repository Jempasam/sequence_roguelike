/**
 * A plain number, optionally bounded. Bounds are part of the schema, so an editor shows them.
 * @param {{default?: number, min?: number, max?: number, description?: string}} spec
 * @returns {ParamKind}
 */
export function number({ default: fallback, min, max, description }?: {
    default?: number;
    min?: number;
    max?: number;
    description?: string;
}): ParamKind;
/**
 * @param {{default?: number, min?: number, max?: number, description?: string}} spec
 * @returns {ParamKind}
 */
export function integer({ default: fallback, min, max, description }?: {
    default?: number;
    min?: number;
    max?: number;
    description?: string;
}): ParamKind;
/**
 * @param {{default?: boolean, description?: string}} spec
 * @returns {ParamKind}
 */
export function boolean({ default: fallback, description }?: {
    default?: boolean;
    description?: string;
}): ParamKind;
/**
 * One of a fixed set of values — the schema turns it into an `enum`, which is what makes an editor
 * offer the list instead of letting you invent a name.
 * @param {readonly any[]} values
 * @param {{default?: any, description?: string}} spec
 * @returns {ParamKind}
 */
export function choice(values: readonly any[], { default: fallback, description }?: {
    default?: any;
    description?: string;
}): ParamKind;
/**
 * A colour, in any of the three spellings the format already accepts.
 * @param {{default?: [number,number,number], description?: string}} spec
 * @returns {ParamKind}
 */
export function color({ default: fallback, description }?: {
    default?: [number, number, number];
    description?: string;
}): ParamKind;
/**
 * An angle in degrees. Kept in degrees all the way to the step that uses it — the conversion to a
 * direction vector is the renderer's business, and a file that says `45` is readable where one
 * that says `[0.707, 0.707]` is not.
 * @param {{default?: number, description?: string}} spec
 * @returns {ParamKind}
 */
export function angle({ default: fallback, description }?: {
    default?: number;
    description?: string;
}): ParamKind;
/**
 * A pair of numbers, `[x, y]`.
 * @param {{default?: [number,number], description?: string}} spec
 * @returns {ParamKind}
 */
export function vector({ default: fallback, description }?: {
    default?: [number, number];
    description?: string;
}): ParamKind;
/**
 * A list of `[x, y]` pairs.
 * @param {{default?: [number,number][], description?: string}} spec
 * @returns {ParamKind}
 */
export function vectorList({ default: fallback, description }?: {
    default?: [number, number][];
    description?: string;
}): ParamKind;
/**
 * A set of material indexes. Written as a list — `[0, 2]` — because that is what a set looks like;
 * the `{0: true}` shape the effects want internally is an implementation detail nobody should have
 * to type.
 * @param {{default?: {[index: number]: true}, description?: string}} spec
 * @returns {ParamKind}
 */
export function materialSet({ default: fallback, description }?: {
    default?: {
        [index: number]: true;
    };
    description?: string;
}): ParamKind;
/**
 * A number attached to each material, written as an object keyed by index: `{"0": 2, "1": 1}`.
 * @param {{default?: {[index: number]: number}, min?: number, max?: number, description?: string}} spec
 * @returns {ParamKind}
 */
export function materialWeights({ default: fallback, min, max, description }?: {
    default?: {
        [index: number]: number;
    };
    min?: number;
    max?: number;
    description?: string;
}): ParamKind;
/**
 * A material index, or nothing. `broken` uses it: "recolour the shards with this material, or
 * leave their material alone".
 * @param {{default?: number|undefined, description?: string}} spec
 * @returns {ParamKind}
 */
export function materialIndexOrNone({ default: fallback, description }?: {
    default?: number | undefined;
    description?: string;
}): ParamKind;
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
export function nested(loader: import("./kit.js").Loader<any>, { default: fallback, description }?: {
    default?: any;
    description?: string;
}): ParamKind;
/**
 * A plain string. Used for the fields that exist for an editor's benefit rather than the
 * renderer's, `$schema` chief among them.
 * @param {{default?: string, description?: string}} spec
 * @returns {ParamKind}
 */
export function text({ default: fallback, description }?: {
    default?: string;
    description?: string;
}): ParamKind;
/**
 * A list of strings, one per row — the shape both pixel grids use.
 * @param {{default?: any, description?: string, pattern?: string}} spec
 * @returns {ParamKind}
 */
export function rows({ default: fallback, description, pattern }?: {
    default?: any;
    description?: string;
    pattern?: string;
}): ParamKind;
export type ParamKind = {
    parse: (value: unknown, path: string) => any;
    schema: () => import("./kit.js").JsonSchema;
    default?: any;
    description?: string;
};
