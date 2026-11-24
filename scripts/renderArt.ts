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
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { filesUnder, sourcesOf } from "./assetDependencies.ts"
import type { AssetRoots } from "./assetDependencies.ts"
import { buildParallax, PARALLAX_SPEC } from "./buildParallax.ts"

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const ART = join(REPO, "raw_assets")
const GENERATED = join(REPO, "generated_assets")
/** Seen as one: what is generated first, then what is written by hand. */
const SOURCES = [GENERATED, join(REPO, "assets")]
const ROOTS: AssetRoots = { art: ART, assets: SOURCES }
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
for(const folder of paintings){
    const path = relative(ART, folder).split(sep).join("/")
    const ora = join(GENERATED, path + ".ora")
    if(changedOnly && !isStale(ora, sourcesOf(join(folder, PARALLAX_SPEC), ROOTS))) continue
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
    if(changedOnly && !isStale(out, sourcesOf(document, ROOTS))) continue
    mkdirSync(dirname(out), { recursive: true })
    execFileSync(process.execPath, [PICTURE, "generate", document, "-o", out, "-s", "1"], { stdio: "ignore" })
    console.log(`Rendered ${path}`)
}
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
    try {
        execFileSync(process.execPath, [SFX, "render", "--batch", manifest], {
            stdio: ["ignore", "ignore", "inherit"],
        })
    } catch {
        fail("A sound failed to render.")
    } finally {
        rmSync(scratch, { recursive: true, force: true })
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
