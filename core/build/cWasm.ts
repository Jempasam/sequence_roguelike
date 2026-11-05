import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "vite"

import { declarationsOf, moduleSourceOf } from "./cModule.ts"
import { compileC } from "./compileC.ts"

/**
 * Import a C file as a module of its exports: `import { sum, memory } from "./sum.c"`.
 *
 * Each C file is a WebAssembly module of its own, compiled by {@link compileC}, inlined in the bundle and
 * instantiated when it is imported. Its functions become functions, its variables their address in its
 * memory, and the declarations of the module are written to {@link GENERATED} for TypeScript.
 * A header included by the file reloads it when it changes.
 */
export function cWasm(): Plugin {
    return {
        name: "c-wasm",
        enforce: "pre",
        async load(id){
            if(!id.endsWith(".c")) return null
            const file = resolve(id)
            const compiled = await compileC(file)
            for(const dependency of compiled.dependencies) this.addWatchFile(dependency)
            if(compiled.warnings) this.warn(compiled.warnings)
            writeDeclarations(file, declarationsOf(compiled, file))
            return moduleSourceOf(compiled, file)
        },
    }
}

/**
 * Where the declarations of the C files are written, out of the sources: `core/src/sum.c` is declared by
 * `.generated/core/src/sum.d.c.ts`. The `rootDirs` of tsconfig.base.json merge it with the repository, so
 * TypeScript finds them for `import ... from "./sum.c"`.
 */
export const GENERATED = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", ".generated")

/** The declarations of a C file, at its path under {@link GENERATED} as `name.d.c.ts`. */
export function declarationPathOf(file: string): string {
    return join(GENERATED, relative(dirname(GENERATED), file)).replace(/\.c$/, ".d.c.ts")
}

/** Write the declarations of a C file, only when they change, so a watcher sees no change otherwise. */
export function writeDeclarations(file: string, declarations: string): void {
    const path = declarationPathOf(file)
    const isUpToDate = existsSync(path) && readFileSync(path, "utf8") === declarations
    if(isUpToDate) return
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, declarations)
}
