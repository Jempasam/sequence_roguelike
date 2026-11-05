import { readFileSync } from "node:fs"
import { basename } from "node:path"

import type { CompiledC } from "./compileC.ts"
import type { WasmExport, WasmType } from "./wasmSignatures.ts"

/** The exports of the linker that are not the C file's own, and stay out of the JS module. */
const LINKER_EXPORTS = /^(_initialize|__.*)$/

/** The words JS forbids as the name of an export binding, that C allows as an identifier. */
const JS_RESERVED = new Set([
    "await", "class", "delete", "export", "extends", "false", "finally", "function", "import", "in",
    "instanceof", "let", "new", "null", "super", "this", "throw", "true", "try", "typeof", "var", "with",
    "yield", "catch", "debugger", "enum", "implements", "interface", "package", "private", "protected",
    "public", "static",
])

const TS_TYPES: Readonly<Record<WasmType, string>> = {
    i32: "number", i64: "bigint", f32: "number", f64: "number",
    v128: "never", funcref: "Function | null", externref: "unknown",
}

/** What the JS module exports for a C file: its functions, its memory, and the address of its variables. */
function publicExportsOf(compiled: CompiledC, file: string): WasmExport[] {
    const exports = compiled.signatures.exports.filter(e => !LINKER_EXPORTS.test(e.name))
    const reserved = exports.filter(e => JS_RESERVED.has(e.name)).map(e => e.name)
    if(reserved.length > 0) throw new Error(`${file} exports ${reserved.join(", ")}, reserved in JS: rename them.`)
    return exports
}

/**
 * The JS module a C file is imported as.
 *
 * The bytes are inlined, so the module is instantiated synchronously when it is imported, with no fetch and
 * no top-level await: core reaches no file by itself, and the desktop bundle is CommonJS.
 */
export function moduleSourceOf(compiled: CompiledC, file: string): string {
    const lines = [
        `const bytes = Uint8Array.from(atob("${Buffer.from(compiled.wasm).toString("base64")}"), c => c.charCodeAt(0))`,
        "const wasm = new WebAssembly.Instance(new WebAssembly.Module(bytes)).exports",
        "wasm._initialize?.()",
    ]
    for(const { kind, name } of publicExportsOf(compiled, file)){
        // A C variable is exported as a global holding its address in the memory.
        const value = kind === "global" ? `wasm.${name}.value` : `wasm.${name}`
        lines.push(`export const ${name} = ${value}`)
    }
    return `${lines.join("\n")}\n`
}

/**
 * The declarations of the JS module a C file is imported as, written beside it as `name.d.c.ts`.
 *
 * WebAssembly keeps the types of a function but not the names of its parameters, so these come from the
 * definition in the C sources, with the doc comment above it.
 */
export function declarationsOf(compiled: CompiledC, file: string): string {
    const sources = compiled.dependencies.map(path => readFileSync(path, "utf8")).join("\n")
    const blocks = publicExportsOf(compiled, file).map(e => declarationOf(e, sources))
    const header = `// Generated from ${basename(file)} by core/build/cWasm.ts, and rewritten by each compilation.`
    return `${[header, ...blocks].join("\n\n")}\n`
}

function declarationOf(e: WasmExport, sources: string): string {
    switch(e.kind){
        case "function": {
            const definition = definitionOf(e.name, sources)
            const names = definition && definition.params.length === e.params.length
                ? definition.params
                : e.params.map((_, i) => `arg${i}`)
            const params = e.params.map((type, i) => `${names[i]}: ${TS_TYPES[type]}`).join(", ")
            const result = e.results.length === 0 ? "void" : TS_TYPES[e.results[0]]
            const doc = docOf([...definition?.doc ?? [], ...definition ? [`\`${definition.signature}\``] : []])
            return `${doc}export declare function ${e.name}(${params}): ${result}`
        }
        case "memory":
            return [
                "/**",
                " * The memory of the module, where pointers point. A view over its buffer is detached when the",
                " * module grows it, as malloc may, so a view is made again after such a call.",
                " */",
                `export declare const ${e.name}: WebAssembly.Memory`,
            ].join("\n")
        case "global":
            return `/** The address of \`${e.name}\` in the memory. */\nexport declare const ${e.name}: number`
        default:
            return `export declare const ${e.name}: unknown`
    }
}

function docOf(lines: readonly string[]): string {
    if(lines.length === 0) return ""
    return `/**\n${lines.map(line => ` *${line ? ` ${line}` : ""}`).join("\n")}\n */\n`
}


//// C sources ////

interface CDefinition {
    /** The lines of the doc comment above the definition, none when there is no doc comment. */
    readonly doc: readonly string[]

    /** The return type, the name and the parameters, on one line. */
    readonly signature: string

    /** The name of each parameter, empty when the function takes none or when one is unnamed. */
    readonly params: readonly string[]
}

/**
 * The definition of a function in C sources, found by a pattern rather than by parsing, so a definition
 * written through a macro is not found and its parameters keep the names `arg0`, `arg1`...
 */
function definitionOf(name: string, sources: string): CDefinition | null {
    const pattern = new RegExp(String.raw`(?:/\*\*((?:[^*]|\*(?!/))*)\*/\s*)?^[ \t]*([\w \t*]+?[\s*])${name}\s*\(([^)]*)\)\s*\{`, "m")
    const match = pattern.exec(sources)
    if(!match) return null
    const [, comment, returnType, paramList] = match
    const pieces = paramList.split(",").map(p => p.replace(/\s+/g, " ").trim()).filter(p => p && p !== "void")
    const names = pieces.map(p => /^.*?[\s*]([A-Za-z_]\w*)\s*(\[[^\]]*\]\s*)*$/.exec(p)?.[1])
    const isNamed = (n: string | undefined): n is string => n !== undefined && !C_TYPE_WORDS.has(n)
    const doc = comment === undefined ? [] : comment.split("\n").map(line => line.replace(/^\s*\*? ?/, "").trimEnd())
    while(doc[0] === "") doc.shift()
    while(doc.at(-1) === "") doc.pop()
    return {
        doc: doc.length > 0 ? [...doc, ""] : [],
        signature: `${returnType.replace(/\s+/g, " ").trim()} ${name}(${pieces.join(", ")})`,
        params: names.every(isNamed) ? names : [],
    }
}

/** The words that end the type of an unnamed parameter, such as `unsigned int`, and are not its name. */
const C_TYPE_WORDS = new Set(["char", "short", "int", "long", "float", "double", "signed", "unsigned", "_Bool", "bool"])
