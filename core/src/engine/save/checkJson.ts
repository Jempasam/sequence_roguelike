/**
 * Check that a value survives `JSON.stringify` unchanged. `JSON.stringify` loses data without a word:
 * `NaN` and `Infinity` become `null`, a `Map` becomes `{}`, a `Uint8Array` an object with numeric keys,
 * and `undefined` disappears.
 *
 * @param value - The value to check.
 * @param path - The name of the value, which starts the path of the faulty value in the error.
 * @throws {@link Error} At the first value other than null, a boolean, a finite number, a string, an
 * array or a plain object, giving its path: `run.entities[3].hp is NaN`.
 */
export function checkJson(value: unknown, path: string): void {
    checkWithin(value, path, new Set())
}

function checkWithin(value: unknown, path: string, parents: Set<object>): void {
    const problem = problemOf(value)
    if(problem) throw new Error(`${path} ${problem}, which JSON cannot hold.`)
    if(typeof value !== "object" || value === null) return
    // A cycle would otherwise recurse until the stack overflows.
    if(parents.has(value)) throw new Error(`${path} refers back to one of its parents, which JSON cannot hold.`)
    parents.add(value)
    if(Array.isArray(value)) value.forEach((item, i) => checkWithin(item, `${path}[${i}]`, parents))
    else for(const [key, item] of Object.entries(value)) checkWithin(item, `${path}${accessOf(key)}`, parents)
    parents.delete(value)
}

/** What makes a value unfit for JSON, said after its path, none when it fits. */
function problemOf(value: unknown): string|null {
    switch(typeof value){
        case "boolean":
        case "string":
            return null
        case "number":
            return Number.isFinite(value) ? null : `is ${value}`
        case "object":
            if(value === null || Array.isArray(value)) return null
            return isPlain(value) ? null : `is a ${value.constructor?.name ?? "object without prototype"}`
        case "undefined":
            return "is undefined"
        default:
            return `is a ${typeof value}`
    }
}

/** Is this object a plain one, made by a literal or `JSON.parse`, and not an instance of a class? */
function isPlain(value: object): boolean {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

/** How a key is written in a path: `.hp`, or `["max hp"]` when it is not an identifier. */
function accessOf(key: string): string {
    return /^[A-Za-z_$][\w$]*$/.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`
}
