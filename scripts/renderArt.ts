// Renders the picture documents of raw_assets/ into assets/, at the same path, a .png for each .pic.json,
// through the CLI of the picture project, then indexes the assets.
//   npm run art                    renders every document
//   npm run art -- mecard/travel   renders those under a folder of raw_assets/ only
// The picture project is looked for next to this repository, or where PICTURE points to.

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, readdirSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const ART = join(REPO, "raw_assets")
const ASSETS = join(REPO, "assets")
const PICTURE = process.env.PICTURE ?? join(REPO, "..", "picture", "bin", "picture.js")
const EXTENSION = ".pic.json"

if(!existsSync(PICTURE)) fail(`The picture project is not at ${PICTURE}. Set PICTURE to its bin/picture.js.`)

const under = join(ART, ...(process.argv[2] ?? "").split("/"))
const documents = filesUnder(under).filter(file => file.endsWith(EXTENSION))
for(const document of documents){
    const path = relative(ART, document).split(sep).join("/")
    const out = join(ASSETS, path.slice(0, -EXTENSION.length) + ".png")
    mkdirSync(dirname(out), { recursive: true })
    execFileSync(process.execPath, [PICTURE, "generate", document, "-o", out, "-s", "1"], { stdio: "ignore" })
    console.log(`Rendered ${path}`)
}
execFileSync(process.execPath, [join(REPO, "scripts", "indexAssets.ts")], { stdio: "inherit" })


function filesUnder(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = join(directory, entry.name)
        return entry.isDirectory() ? filesUnder(path) : [path]
    })
}

function fail(message: string): never {
    console.error(message)
    process.exit(1)
}
