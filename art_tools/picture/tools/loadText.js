import { readFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"

/**
 * The one place where a value arrives as text rather than as parsed JSON: the command line.
 *
 * A command-line value can be three things, and they have to be told apart without asking the
 * filesystem — a rule that probes the disk gives different answers on different machines and
 * cannot be tested dry. So the decision is made on the **shape of the string alone**:
 *
 *   starts with { or [    inline JSON
 *   starts with ./ ../ / ~/ or C:\   (either slash)    a path to a JSON file
 *   anything else         a bare name, handed to the loader as a string
 *
 * That last line is what makes `-e furry` and `-p shaded` work: a bare name is the common case,
 * and the router turns it into a default instance. It is the same rule Node uses to tell a file
 * from a package name, so there is nothing new to learn.
 *
 * Positional file operands (`picture generate sword.pic.json`) do NOT go through this: a command
 * that declares its argument a path has nothing to disambiguate, and demanding `./` there would be
 * ceremony. The rule exists only where a bare name has a competing meaning.
 */

/** `./x` `../x` `/x` `~/x` `C:\x` — either slash, because PowerShell's tab completion uses `\`. */
const PATH_PREFIX = /^(\.{1,2}[\\/]|[\\/]|~[\\/]|[A-Za-z]:[\\/])/

/** @param {string} text */
export function looksLikePath(text){
    return PATH_PREFIX.test(text.trim())
}

/** @param {string} text */
export function looksLikeJson(text){
    const trimmed = text.trim()
    return trimmed.startsWith("{") || trimmed.startsWith("[")
}

/**
 * Text to data, by the rule above. Returns the *unparsed-by-a-loader* value: the CLI needs the raw
 * data to merge overrides into a document before loading it all at once.
 * @param {string} text
 * @param {{baseDir?: string, what?: string}=} options
 * @returns {unknown}
 */
export function resolveText(text, {baseDir = process.cwd(), what = "value"} = {}){
    if(looksLikeJson(text)){
        try{
            return JSON.parse(text)
        }
        catch(cause){
            throw new Error(`${what}: not valid JSON — ${cause instanceof Error ? cause.message : String(cause)}`)
        }
    }

    if(looksLikePath(text)){
        const trimmed = text.trim()
        const expanded = /^~[\\/]/.test(trimmed) ? path.join(os.homedir(), trimmed.slice(2)) : trimmed
        const file = path.resolve(baseDir, expanded)
        let content
        try{
            content = readFileSync(file, "utf8")
        }
        catch(cause){
            throw new Error(`${what}: cannot read ${file} — ${cause instanceof Error ? cause.message : String(cause)}`)
        }
        try{
            return JSON.parse(content)
        }
        catch(cause){
            throw new Error(`${what}: ${file} is not valid JSON — ${cause instanceof Error ? cause.message : String(cause)}`)
        }
    }

    return text.trim()
}

/**
 * Text to a `T`, through a loader. The method the whole command line is built on.
 * @template T
 * @param {string} text
 * @param {import("../dist/loader/kit.js").Loader<T>} loader
 * @param {{baseDir?: string, what?: string}=} options
 * @returns {T}
 */
export function loadText(text, loader, options = {}){
    return loader.load(resolveText(text, options), options.what ?? "")
}

/**
 * A path that is declared to be one — a positional operand. No shape rule, no ambiguity.
 * @param {string} file
 * @param {{baseDir?: string}=} options
 * @returns {unknown}
 */
export function readJsonFile(file, {baseDir = process.cwd()} = {}){
    const resolved = path.resolve(baseDir, file)
    let content
    try{
        content = readFileSync(resolved, "utf8")
    }
    catch(cause){
        throw new Error(`cannot read ${resolved} — ${cause instanceof Error ? cause.message : String(cause)}`)
    }
    try{
        return JSON.parse(content)
    }
    catch(cause){
        throw new Error(`${resolved} is not valid JSON — ${cause instanceof Error ? cause.message : String(cause)}`)
    }
}
