import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { commands, Exit, type Tree } from "@yowasp/clang"

import { signaturesOf, type WasmSignatures } from "./wasmSignatures.ts"

/**
 * The flags every C file is compiled with.
 *
 * - wasm32-wasip1 is the target the bundled sysroot is built for: its libc brings malloc, string.h and
 *   libm, which import nothing. What reaches the outside world (stdio, time, files) imports WASI, and is
 *   refused by {@link compileC}.
 * - Default visibility, so a function or a variable is exported unless it is `static`, as with any C
 *   library. The libc is built hidden, so none of it is exported.
 * - Reactor: no `main`, and `_initialize` runs the static constructors once the module is instantiated.
 * - SIMD128 is in every browser and Node since 2021, and stays deterministic. Relaxed SIMD does not, so it
 *   stays off.
 */
const FLAGS = [
    "--target=wasm32-wasip1", "-O3", "-msimd128", "-Wall", "-Wextra",
    "-fvisibility=default", "-mexec-model=reactor", "-Wl,--export-dynamic",
]

/** Where the package of the compiled file is mounted in the virtual filesystem clang runs in. */
const MOUNT = "package"

/** The extensions of the sources mounted for clang to read. */
const SOURCE_EXTENSIONS = [".c", ".h"]

/** The folders of a package never mounted, as they hold no source of the package. */
const SKIPPED_FOLDERS = ["node_modules", "dist"]

/** The largest module Chrome compiles synchronously on the main thread, in bytes. */
const MAX_SYNC_COMPILE = 8 * 1024 * 1024

/** A C file compiled to WebAssembly. */
export interface CompiledC {
    readonly wasm: Uint8Array
    readonly signatures: WasmSignatures

    /** The absolute paths of the files of the package the compilation read, the C file included. */
    readonly dependencies: readonly string[]

    /** What clang warned about, empty when nothing. */
    readonly warnings: string
}

/**
 * Compile a C file into a module that imports nothing.
 *
 * Clang runs in WebAssembly from `@yowasp/clang`, so nothing is installed on the machine. It runs in a
 * virtual filesystem holding the `.c` and `.h` files of the package of the C file: an `#include "..."`
 * reaches any of them by its relative path.
 *
 * @param file - The absolute path of the C file.
 * @throws {@link Error} when clang fails, with its messages, or when the module imports something.
 */
export async function compileC(file: string): Promise<CompiledC> {
    const root = packageOf(file)
    const source = `${MOUNT}/${relative(root, file).split(sep).join("/")}`
    let stderr = ""
    const decoder = new TextDecoder()
    const options = {
        decodeASCII: false,
        stderr: (bytes: Uint8Array | null) => { if(bytes) stderr += decoder.decode(bytes, { stream: true }) },
    }
    // Fetched once, without the progress log yowasp prints when the first run fetches them.
    clangResources ??= Promise.resolve(commands.clang(undefined, {}, { fetchProgress: () => {} }))
    await clangResources
    const args = [...FLAGS, "-MD", "-MF", "out.d", source, "-o", "out.wasm"]
    let output: Tree|undefined
    try {
        output = await commands.clang(args, { [MOUNT]: sourcesUnder(root) }, options)
    } catch(error){
        if(!(error instanceof Exit)) throw error
        throw new Error(`clang failed on ${file}:\n${onDisk(stderr, root)}`)
    }
    const wasm = outputOf(output, "out.wasm")
    const signatures = signaturesOf(wasm)
    if(signatures.imports.length > 0){
        throw new Error(`${file} imports ${signatures.imports.join(", ")}. core's modules run without I/O, so `
            + "nothing that reaches the outside world (stdio, time, files) can be called.")
    }
    if(wasm.length > MAX_SYNC_COMPILE){
        throw new Error(`${file} compiles to ${wasm.length} bytes, over the ${MAX_SYNC_COMPILE} Chrome compiles `
            + "synchronously on its main thread.")
    }
    return {
        wasm,
        signatures,
        dependencies: dependenciesOf(decoder.decode(outputOf(output, "out.d")), root),
        warnings: onDisk(stderr, root),
    }
}

/** The compiler and its sysroot, about 100 MB, loaded by the first compilation only. */
let clangResources: Promise<unknown> | undefined

function outputOf(tree: Tree|undefined, name: string): Uint8Array {
    const file = tree?.[name]
    if(!(file instanceof Uint8Array)) throw new Error(`clang wrote no ${name}.`)
    return file
}


//// Virtual filesystem ////

/** The folder of the package.json closest to a file. */
function packageOf(file: string): string {
    for(let directory = dirname(file); ; directory = dirname(directory)){
        if(existsSync(join(directory, "package.json"))) return directory
        if(dirname(directory) === directory) throw new Error(`${file} is in no package.`)
    }
}

function sourcesUnder(directory: string): Tree {
    const tree: Tree = {}
    for(const entry of readdirSync(directory, { withFileTypes: true })){
        const path = join(directory, entry.name)
        const isSkipped = entry.name.startsWith(".") || SKIPPED_FOLDERS.includes(entry.name)
        if(entry.isDirectory() && !isSkipped) tree[entry.name] = sourcesUnder(path)
        const isSource = SOURCE_EXTENSIONS.some(extension => entry.name.endsWith(extension))
        if(entry.isFile() && isSource) tree[entry.name] = readFileSync(path)
    }
    return tree
}

/** The files of the package listed in a make rule written by `-MD`, the system headers left out. */
function dependenciesOf(rule: string, root: string): string[] {
    const [, prerequisites = ""] = rule.split(/:\s/)
    return prerequisites.split(/\s+/)
        .filter(path => path.startsWith(`${MOUNT}/`))
        .map(path => resolve(root, path.slice(MOUNT.length + 1)))
}

/** Clang's messages with the paths of the disk, so they can be clicked. */
function onDisk(messages: string, root: string): string {
    const mounted = new RegExp(String.raw`${MOUNT}/([^\s:]+)`, "g")
    return messages.replace(mounted, (_, path: string) => resolve(root, path)).trim()
}
