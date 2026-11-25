// Renders the picture documents of raw_assets/ into generated_assets/ (not committed), at the same path, a
// .png for each .pic.json, through the CLI of the picture project, then indexes the assets.
//   npm run art                    renders every document
//   npm run art -- mecard/travel   renders those under a folder of raw_assets/ only
//   npm run art -- --changed       (alone or with a folder) renders only what is missing or older than its source:
//                                  a source against its output and everything it is made from (see assetDependencies.ts):
//                                  a .pic.json against its .png and the documents it lays in, a .faust.dsp against its .ogg
//                                  and the files it imports, any file of a parallax folder against its .ora;
//   npm run art:preview -- <folder> also writes a preview.png in each parallax folder built, to help create it;
//                                  no other command writes one
// A .faust.dsp is a sound effect: rendered to an .ogg at the same path, in one call, through the CLI of the soundeffect
// project, embedded in art_tools/ or where SFX points to. --changed applies to it as to a picture.
// A .lib.dsp is no sound of the game: it is never rendered, only imported by the sounds that use it.
// A .json beside a .pic.json (units/wolf.json for units/wolf.pic.json) is copied beside the .png: the data of the picture.
// A folder holding a parallax.json is assembled into one painting, <folder>.ora (see buildParallax.ts).
// The picture project is embedded in art_tools/ (updated by `npm run art:sync`), or where PICTURE points to.

import { execFileSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, delimiter, dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { filesUnder, sourcesOf } from "./assetDependencies.ts"
import type { AssetRoots } from "./assetDependencies.ts"
import { PARALLAX_SPEC } from "./buildParallax.ts"
import { LIMIT, runNode } from "./jobPool.ts"

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const ART = join(REPO, "raw_assets")
const GENERATED = join(REPO, "generated_assets")
/** Seen as one: what is generated first, then what is written by hand. */
const SOURCES = [GENERATED, join(REPO, "assets")]
const ROOTS: AssetRoots = { art: ART, assets: SOURCES }
/** The script building one painting, run as a process of its own. */
const BUILD_PARALLAX = join(REPO, "scripts", "buildParallaxCli.ts")
const PICTURE = process.env.PICTURE ?? join(REPO, "art_tools", "picture", "bin", "picture.js")
const SFX = process.env.SFX ?? join(REPO, "art_tools", "soundeffect", "bin", "sfx.js")
const EXTENSION = ".pic.json"
const SOUND_EXTENSION = ".faust.dsp"
const SOUND_FORMAT = "ogg"
const SOUND_OUTPUT = "." + SOUND_FORMAT

if(!existsSync(PICTURE)){
    fail(`The picture project is not at ${PICTURE}. Run npm run art:sync, or set PICTURE to its bin/picture.js.`)
}

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
// The sounds, the paintings and the pictures are all rendered at once, the processes sharing the cores (see jobPool.ts).
const renderings: Promise<void>[] = []
const sounds = files.filter(file => file.endsWith(SOUND_EXTENSION)).map(source => ({
    path: relative(ART, source).split(sep).join("/"),
    source,
    out: join(GENERATED, relative(ART, source).slice(0, -SOUND_EXTENSION.length) + SOUND_OUTPUT),
})).filter(sound => !changedOnly || isStale(sound.out, sourcesOf(sound.source, ROOTS)))
if(sounds.length > 0){
    if(!existsSync(SFX)){
        fail(`The soundeffect project is not at ${SFX}. Run npm run art:sync, or set SFX to its bin/sfx.js.`)
    }
    for(const sound of sounds) mkdirSync(dirname(sound.out), { recursive: true })
    // A manifest, not the command line: all the sounds at once do not fit in the one of Windows.
    const scratch = mkdtempSync(join(tmpdir(), "sfx-"))
    const manifest = join(scratch, "jobs.json")
    writeFileSync(manifest, JSON.stringify(sounds.map(sound => ({ src: sound.source, out: sound.out, format: SOUND_FORMAT }))))
    // They are the longest job: asked first, on half of the threads, which they take from the pool.
    const threads = Math.max(1, Math.min(LIMIT, Number(process.env.ART_SOUND_JOBS) || Math.ceil(LIMIT / 2)))
    renderings.push(runNode([SFX, "render", "--batch", manifest, "--jobs", String(threads)], threads).catch(error => {
        throw new Error(`A sound failed to render. ${error instanceof Error ? error.message : String(error)}`)
    }).then(() => {
        for(const sound of sounds) console.log(`Rendered ${sound.path}`)
    }).finally(() => rmSync(scratch, { recursive: true, force: true })))
}
const paintingsToBuild = paintings.filter(folder => {
    const ora = join(GENERATED, relative(ART, folder).split(sep).join("/") + ".ora")
    return !changedOnly || isStale(ora, sourcesOf(join(folder, PARALLAX_SPEC), ROOTS))
})
const building = new Map<string, Promise<void>>()
/** A painting built, after the paintings it takes layers from, when those are built in this run too. */
function buildPainting(folder: string): Promise<void> {
    let promise = building.get(folder)
    if(promise === undefined){
        promise = (async () => {
            await Promise.all(paintingsTakenFrom(folder).filter(source => paintingsToBuild.includes(source)).map(buildPainting))
            const path = relative(ART, folder).split(sep).join("/")
            const told = await runNode([
                BUILD_PARALLAX, folder, join(GENERATED, path + ".ora"), PICTURE, preview ? "preview" : "nopreview", SOURCES.join(delimiter),
            ])
            console.log(`${told}Built ${path}.ora`)
        })()
        building.set(folder, promise)
    }
    return promise
}
renderings.push(...paintingsToBuild.map(buildPainting))
for(const document of documents){
    const path = relative(ART, document).split(sep).join("/")
    const out = join(GENERATED, path.slice(0, -EXTENSION.length) + ".png")
    if(changedOnly && !isStale(out, sourcesOf(document, ROOTS))) continue
    mkdirSync(dirname(out), { recursive: true })
    renderings.push(runNode([PICTURE, "generate", document, "-o", out, "-s", "1"]).then(() => console.log(`Rendered ${path}`)))
}
try {
    await Promise.all(renderings)
} catch(error){
    fail(error instanceof Error ? error.message : String(error))
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


/** The folders of the paintings a painting takes layers from (`from` in its parallax.json). */
function paintingsTakenFrom(folder: string): string[] {
    const spec = JSON.parse(readFileSync(join(folder, PARALLAX_SPEC), "utf8")) as { layers: { from?: { ora: string } }[] }
    return spec.layers.flatMap(layer => {
        if(layer.from === undefined) return []
        const segments = layer.from.ora.split("/")
        return [join(ART, ...segments.slice(0, -1), basename(segments[segments.length - 1], ".ora"))]
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
