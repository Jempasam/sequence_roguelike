// Compiles every C file of core/src and test/src, and writes the declarations TypeScript reads for each to
// .generated/, as Vite does when it imports one. So a C file changed while no Vite runs is typechecked
// against what it exports now, and an error in it shows up without starting the game. The folder is
// emptied first, so a deleted C file leaves no declarations behind.
//   npm run wasm

import { readdirSync, rmSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { declarationsOf } from "../core/build/cModule.ts"
import { compileC } from "../core/build/compileC.ts"
import { GENERATED, writeDeclarations } from "../core/build/cWasm.ts"

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SOURCES = [join(REPO, "core", "src"), join(REPO, "test", "src")]

rmSync(GENERATED, { recursive: true, force: true })
for(const file of SOURCES.flatMap(cFilesUnder)){
    const compiled = await compileC(file)
    if(compiled.warnings) console.warn(compiled.warnings)
    writeDeclarations(file, declarationsOf(compiled, file))
    console.log(`Compiled ${relative(REPO, file)}, ${compiled.wasm.length} bytes.`)
}


function cFilesUnder(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = join(directory, entry.name)
        if(entry.isDirectory()) return cFilesUnder(path)
        return entry.name.endsWith(".c") ? [path] : []
    })
}
