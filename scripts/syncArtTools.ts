// Copies the rendering part of the picture and soundeffect projects into art_tools/ (committed), so that
// `npm run art` works where those projects are not: the CI, another machine.
//   npm run art:sync    builds each project if its dist/ is older than its src/, then copies it
// The projects are looked for next to this repository, or where PICTURE_SRC and SFX_SRC point to.

import { execSync } from "node:child_process"
import { cpSync, existsSync, readdirSync, rmSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

/** A project to embed: where it is, where it goes and which of its folders the rendering needs. */
interface Tool {
    readonly name: string
    readonly source: string
    readonly folders: readonly string[]
}

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const TARGET = join(REPO, "art_tools")
const TOOLS: Tool[] = [
    {
        name: "picture",
        source: process.env.PICTURE_SRC ?? join(REPO, "..", "picture"),
        folders: ["bin", "dist", "tools"],
    },
    {
        name: "soundeffect",
        source: process.env.SFX_SRC ?? join(REPO, "..", "soundeffect"),
        folders: ["bin", "dist", "lib"],
    },
]

for(const tool of TOOLS){
    if(!existsSync(tool.source)) fail(`The ${tool.name} project is not at ${tool.source}. Set ${tool.name === "picture" ? "PICTURE_SRC" : "SFX_SRC"} to its folder.`)
    if(isBuildStale(tool.source)){
        console.log(`Building ${tool.name}`)
        execSync("npm run build", { cwd: tool.source, stdio: "inherit" })
    }
    const out = join(TARGET, tool.name)
    rmSync(out, { recursive: true, force: true })
    for(const folder of tool.folders){
        const from = join(tool.source, folder)
        if(!existsSync(from)) fail(`${from} does not exist: the ${tool.name} project is not built.`)
        cpSync(from, join(out, folder), { recursive: true })
    }
    console.log(`Copied ${tool.name}`)
}


/** True when a file of src/ is newer than the oldest file of dist/, or dist/ is missing. */
function isBuildStale(project: string): boolean {
    const dist = join(project, "dist")
    if(!existsSync(dist)) return true
    const built = Math.min(...filesUnder(dist).map(file => statSync(file).mtimeMs))
    return filesUnder(join(project, "src")).some(file => statSync(file).mtimeMs > built)
}

/** Every file under a folder, at any depth. */
function filesUnder(folder: string): string[] {
    if(!existsSync(folder)) return []
    return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
        const path = join(folder, entry.name)
        return entry.isDirectory() ? filesUnder(path) : [path]
    })
}

function fail(message: string): never {
    console.error(message)
    process.exit(1)
}
