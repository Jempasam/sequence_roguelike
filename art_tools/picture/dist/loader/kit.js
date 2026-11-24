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
    constructor(path, problem) {
        super(path ? `${path}: ${problem}` : problem);
        this.name = "LoadError";
        this.path = path;
        this.problem = problem;
    }
}
/**
 * Extend a path. `at("filters", "[2]")` is `filters[2]`; `at("filters[2]", "dy")` is
 * `filters[2].dy`.
 * @param {string} path @param {string} step
 */
export function at(path, step) {
    if (!path)
        return step.startsWith("[") ? step : step;
    return step.startsWith("[") ? path + step : `${path}.${step}`;
}
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
export function objectLoader({ id, description, params = {}, build }) {
    const names = Object.keys(params);
    const required = names.filter(name => params[name].default === undefined);
    return {
        id,
        description,
        load(data, path = "") {
            /** @type {{[name: string]: unknown}} */ let raw;
            if (data === undefined || data === null)
                raw = {};
            else if (typeof data === "string") {
                if (data !== id)
                    throw new LoadError(path, `expected "${id}", got ${JSON.stringify(data)}`);
                raw = {};
            }
            else if (typeof data === "object" && !Array.isArray(data))
                raw = /** @type {any} */ (data);
            else
                throw new LoadError(path, `expected "${id}" or an object configuring it, got ${JSON.stringify(data)}`);
            // A typo in a parameter name must be an error, never a silently ignored key: a
            // misspelled option that quietly does nothing is the worst outcome of the whole design.
            for (const name of Object.keys(raw)) {
                if (name === "id" || name in params)
                    continue;
                const known = names.length ? names.join(", ") : "none";
                throw new LoadError(at(path, name), `"${id}" has no such parameter (it takes: ${known})`);
            }
            for (const name of required) {
                if (!(name in raw))
                    throw new LoadError(path, `"${id}" needs a "${name}"`);
            }
            /** @type {{[name: string]: any}} */ const values = {};
            for (const name of names) {
                values[name] = name in raw
                    ? params[name].parse(raw[name], at(path, name))
                    : params[name].default;
            }
            return build(values);
        },
        schema() {
            /** @type {{[name: string]: object}} */ const properties = { id: { const: id } };
            for (const name of names) {
                const kind = params[name];
                properties[name] = {
                    ...kind.schema(),
                    // `default: null` only means "optional"; publishing it as a schema default
                    // would tell an editor to offer `null`, which is never a valid value.
                    ...(kind.default !== undefined && kind.default !== null && { default: kind.default }),
                };
            }
            return {
                type: "object",
                title: id,
                ...(description && { description }),
                properties,
                required: ["id", ...required],
                additionalProperties: false,
            };
        },
    };
}
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
export function recordLoader({ title, description, params, build }) {
    const names = Object.keys(params);
    const required = names.filter(name => params[name].default === undefined);
    return {
        load(data, path = "") {
            if (data === undefined || data === null)
                data = {};
            if (typeof data !== "object" || Array.isArray(data)) {
                throw new LoadError(path, `expected ${title}, an object, got ${JSON.stringify(data)}`);
            }
            const raw = /** @type {{[name: string]: unknown}} */ (data);
            for (const name of Object.keys(raw)) {
                if (name in params)
                    continue;
                throw new LoadError(at(path, name), `${title} has no such field (it takes: ${names.join(", ")})`);
            }
            for (const name of required) {
                if (!(name in raw))
                    throw new LoadError(path, `${title} needs a "${name}"`);
            }
            /** @type {{[name: string]: any}} */ const values = {};
            for (const name of names) {
                values[name] = name in raw
                    ? params[name].parse(raw[name], at(path, name))
                    : params[name].default;
            }
            return build(values);
        },
        schema() {
            /** @type {{[name: string]: object}} */ const properties = {};
            for (const name of names) {
                const kind = params[name];
                properties[name] = {
                    ...kind.schema(),
                    // `default: null` only means "optional"; publishing it as a schema default
                    // would tell an editor to offer `null`, which is never a valid value.
                    ...(kind.default !== undefined && kind.default !== null && { default: kind.default }),
                };
            }
            return {
                type: "object",
                title,
                ...(description && { description }),
                properties,
                required,
                additionalProperties: false,
            };
        },
    };
}
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
export function registryLoader({ what, entries, idKey = "id" }) {
    const ids = Object.keys(entries);
    /** @param {string} id @param {string} path @returns {never} */
    function unknown(id, path) {
        // A misspelling is the common failure, so say what was close before dumping the whole list.
        const near = ids.filter(known => known.startsWith(id.slice(0, 3)) || known.includes(id));
        const hint = near.length ? `did you mean ${near.map(it => `"${it}"`).join(" or ")}? ` : "";
        throw new LoadError(path, `unknown ${what} "${id}" — ${hint}known ${what}s: ${ids.join(", ")}`);
    }
    return {
        entries,
        ids,
        load(data, path = "") {
            if (typeof data === "string") {
                const entry = entries[data];
                if (!entry)
                    unknown(data, path);
                return entry.load(data, path);
            }
            if (data === null || typeof data !== "object" || Array.isArray(data)) {
                throw new LoadError(path, `expected a ${what} name or an object with an "${idKey}", got ${JSON.stringify(data)}`);
            }
            const id = /** @type {any} */ (data)[idKey];
            if (id === undefined)
                throw new LoadError(path, `this ${what} has no "${idKey}"`);
            if (typeof id !== "string")
                throw new LoadError(at(path, idKey), `expected a ${what} name, got ${JSON.stringify(id)}`);
            const entry = entries[id];
            if (!entry)
                unknown(id, at(path, idKey));
            return entry.load(data, path);
        },
        schema() {
            return {
                title: what,
                oneOf: [
                    { type: "string", enum: ids, description: `a ${what}, with its default settings` },
                    ...ids.map(id => entries[id].schema()),
                ],
            };
        },
    };
}
/**
 * Zero or more of something. A lone value counts as a list of one, because `"filters": "furry"`
 * is what anyone writes for a single filter and refusing it would be pedantry.
 *
 * @template T
 * @param {Loader<T>} item
 * @param {{what: string}} spec
 * @returns {Loader<T[]>}
 */
export function listLoader(item, { what }) {
    return {
        load(data, path = "") {
            if (data === undefined || data === null)
                return [];
            if (!Array.isArray(data))
                return [item.load(data, path)];
            return data.map((entry, index) => item.load(entry, at(path, `[${index}]`)));
        },
        schema() {
            const one = item.schema();
            return {
                title: what,
                oneOf: [one, { type: "array", items: one }],
            };
        },
    };
}
