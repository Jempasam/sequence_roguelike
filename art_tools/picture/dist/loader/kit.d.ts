/**
 * Extend a path. `at("filters", "[2]")` is `filters[2]`; `at("filters[2]", "dy")` is
 * `filters[2].dy`.
 * @param {string} path @param {string} step
 */
export function at(path: string, step: string): string;
/**
 * One named thing with named parameters.
 *
 * `load` accepts three spellings of the same thing: the id as a bare string, nothing at all, or an
 * object carrying the parameters. All three mean "this thing"; the last one configures it.
 *
 * @template T
 * @param {{
 *   id: string,
 *   description?: string,
 *   params?: {[name: string]: import("./params.js").ParamKind},
 *   build: (values: any) => T,
 * }} spec
 * @returns {Loader<T> & {id: string, description?: string}}
 */
export function objectLoader<T>({ id, description, params, build }: {
    id: string;
    description?: string;
    params?: {
        [name: string]: import("./params.js").ParamKind;
    };
    build: (values: any) => T;
}): Loader<T> & {
    id: string;
    description?: string;
};
/**
 * A record: named parameters, but no id and so no bare-string spelling. The palette entry, the
 * pixel grids and the document itself are records — there is only one kind of each, so there is
 * nothing to route on.
 *
 * @template T
 * @param {{
 *   title: string,
 *   description?: string,
 *   params: {[name: string]: import("./params.js").ParamKind},
 *   build: (values: any) => T,
 * }} spec
 * @returns {Loader<T>}
 */
export function recordLoader<T>({ title, description, params, build }: {
    title: string;
    description?: string;
    params: {
        [name: string]: import("./params.js").ParamKind;
    };
    build: (values: any) => T;
}): Loader<T>;
/**
 * The router: a bare string is the default instance of the thing it names, an object with an `id`
 * is that thing configured.
 *
 * @template T
 * @param {{
 *   what: string,
 *   entries: {[id: string]: Loader<T> & {id: string}},
 *   idKey?: string,
 * }} spec
 * @returns {Loader<T> & {entries: {[id: string]: Loader<T>}, ids: string[]}}
 */
export function registryLoader<T>({ what, entries, idKey }: {
    what: string;
    entries: {
        [id: string]: Loader<T> & {
            id: string;
        };
    };
    idKey?: string;
}): Loader<T> & {
    entries: {
        [id: string]: Loader<T>;
    };
    ids: string[];
};
/**
 * Zero or more of something. A lone value counts as a list of one, because `"filters": "furry"`
 * is what anyone writes for a single filter and refusing it would be pedantry.
 *
 * @template T
 * @param {Loader<T>} item
 * @param {{what: string}} spec
 * @returns {Loader<T[]>}
 */
export function listLoader<T>(item: Loader<T>, { what }: {
    what: string;
}): Loader<T[]>;
/**
 * The loader kit.
 *
 * A `Loader<T>` does two things: turn a serialisable object into a `T`, and describe what it
 * accepts as JSON Schema.
 *
 *   load(data, path) -> T        `path` is where `data` sits in the document, for error messages
 *   schema()         -> object   JSON Schema, descriptive: it feeds an editor and the docs
 *
 * The schema is **not** used to validate — `load` checks as it goes, because that is what produces
 * an error naming the exact field. The schema exists so a `$schema` line in a `.pic.json` gives
 * autocompletion, and it is derived from the same parameter declarations `load` checks against, so
 * the two cannot drift.
 *
 * Four combinators cover everything the format needs:
 *
 *   objectLoader    one named thing with named parameters — a filter, a render step
 *   recordLoader    named parameters with no id, because there is only one kind — the palette,
 *                   the pixel matrix, the document itself
 *   registryLoader  a string picks a default instance, an object with an `id` picks and configures
 *   listLoader      zero or more of something, and a lone value counts as a list of one
 *
 */
/** @typedef {{[key: string]: any}} JsonSchema a JSON Schema document */
/**
 * @template T
 * @typedef {{load: (data: unknown, path?: string) => T, schema: () => JsonSchema}} Loader
 */
/**
 * An error that knows *where* it happened. Nested loaders each add their own step to the path, so
 * a failure eight levels down still reads as `filters[2].lens.0: expected a number, got "1"`.
 */
export class LoadError extends Error {
    /** @param {string} path @param {string} problem */
    constructor(path: string, problem: string);
    path: string;
    problem: string;
}
/**
 * a JSON Schema document
 */
export type JsonSchema = {
    [key: string]: any;
};
export type Loader<T> = {
    load: (data: unknown, path?: string) => T;
    schema: () => JsonSchema;
};
