// Renders the picture documents of raw_assets/ into generated_assets/ (not committed), at the same path, a
// .png for each .pic.json, through the CLI of the picture project, then indexes the assets.
//   npm run art                    renders every document
//   npm run art -- mecard/travel   renders those under a folder of raw_assets/ only
//   npm run art -- --changed       (alone or with a folder) renders only what is missing or older than its source:
//                                  a .pic.json against its .png, any file of a parallax folder against its .ora;
//   npm run art:preview -- <folder> also writes a preview.png in each parallax folder built, to help create it;
//                                  no other command writes one
// A .faust.dsp is a sound effect: rendered to a .wav at the same path, in one call, through the CLI of the soundeffect
// project, looked for next to this repository, or where SFX points to. --changed applies to it as to a picture.
// A .json beside a .pic.json (units/wolf.json for units/wolf.pic.json) is copied beside the .png: the data of the picture.
// A folder holding a parallax.json is assembled into one painting, <folder>.ora (see buildParallax.ts).
// The picture project is looked for next to this repository, or where PICTURE points to.

import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs"
import { basename, dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { buildParallax, PARALLAX_SPEC } from "./buildParallax.ts"

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const ART = join(REPO, "raw_assets")
const GENERATED = join(REPO, "generated_assets")
/** Seen as one: what is generated first, then what is written by hand. */
const SOURCES = [GENERATED, join(REPO, "assets")]
const PICTURE = process.env.PICTURE ?? join(REPO, "..", "picture", "bin", "picture.js")
const SFX = process.env.SFX ?? join(REPO, "..", "soundeffect", "bin", "sfx.js")
const EXTENSION = ".pic.json"
const SOUND_EXTENSION = ".faust.dsp"
/** Written in a parallax folder after its .ora, so it is no source: it would always make the painting look stale. */
const PREVIEW = "preview.png"

if(!existsSync(PICTURE)) fail(`The picture project is not at ${PICTURE}. Set PICTURE to its bin/picture.js.`)

const args = process.argv.slice(2)
const changedOnly = args.includes("--changed")
const preview = args.includes("--preview")
const folderArg = args.find(arg => !arg.startsWith("--")) ?? ""
const under = join(ART, ...folderArg.split("/").filter(Boolean))
const files = filesUnder(under)
// A folder holding a parallax.json is one painting: its documents are its layers, not pictures apart.
const paintings = files.filter(file => file.endsWith(sep + PARALLAX_SPEC)).map(dirname)
const documents = files.filter(file => file.endsWith(EXTENSION))
    .filter(file => !paintings.some(folder => file.startsWith(folder + sep)))
for(const folder of paintings){
    const path = relative(ART, folder).split(sep).join("/")
    const ora = join(GENERATED, path + ".ora")
    if(changedOnly && !isStale(ora, filesUnder(folder).filter(file => basename(file) !== PREVIEW))) continue
    try {
        await buildParallax(folder, ora, SOURCES, PICTURE, preview)
    } catch(error){
        fail(error instanceof Error ? error.message : String(error))
    }
    console.log(`Built ${path}.ora`)
}
for(const document of documents){
    const path = relative(ART, document).split(sep).join("/")
    const out = join(GENERATED, path.slice(0, -EXTENSION.length) + ".png")
    if(changedOnly && !isStale(out, [document])) continue
    mkdirSync(dirname(out), { recursive: true })
    execFileSync(process.execPath, [PICTURE, "generate", document, "-o", out, "-s", "1"], { stdio: "ignore" })
    console.log(`Rendered ${path}`)
}
const sounds = files.filter(file => file.endsWith(SOUND_EXTENSION)).map(source => ({
    path: relative(ART, source).split(sep).join("/"),
    source,
    out: join(GENERATED, relative(ART, source).slice(0, -SOUND_EXTENSION.length) + ".wav"),
})).filter(sound => !changedOnly || isStale(sound.out, [sound.source]))
if(sounds.length > 0){
    if(!existsSync(SFX)) fail(`The soundeffect project is not at ${SFX}. Set SFX to its bin/sfx.js.`)
    for(const sound of sounds) mkdirSync(dirname(sound.out), { recursive: true })
    const outputs = sounds.flatMap(sound => ["-o", sound.out])
    try {
        const sources = sounds.map(sound => sound.source)
        execFileSync(process.execPath, [SFX, "render", ...sources, ...outputs, "-f", "wav"], {
            stdio: ["ignore", "ignore", "inherit"],
        })
    } catch {
        fail("A sound failed to render.")
    }
    for(const sound of sounds) console.log(`Rendered ${sound.path}`)
}
// A .json beside a document, of the name of its picture, is its data: copied to the same path, so the game finds it
// next to the .png. A parallax.json is no data of a picture, and a folder holding one is a painting.
const data = files.filter(file => file.endsWith(".json") && !file.endsWith(EXTENSION) && basename(file) !== PARALLAX_SPEC)
    .filter(file => !paintings.some(folder => file.startsWith(folder + sep)))
for(const file of data){
    const path = relative(ART, file).split(sep).join("/")
    const out = join(GENERATED, path)
    if(changedOnly && !isStale(out, [file])) continue
    mkdirSync(dirname(out), { recursive: true })
    copyFileSync(file, out)
    console.log(`Copied ${path}`)
}
execFileSync(process.execPath, [join(REPO, "scripts", "indexAssets.ts")], { stdio: "inherit" })


function filesUnder(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = join(directory, entry.name)
        return entry.isDirectory() ? filesUnder(path) : [path]
    })
}

/** True when the output is missing or older than one of its sources. */
function isStale(output: string, sources: string[]): boolean {
    if(!existsSync(output)) return true
    const built = statSync(output).mtimeMs
    return sources.some(source => statSync(source).mtimeMs > built)
}

function fail(message: string): never {
    console.error(message)
    process.exit(1)
}
