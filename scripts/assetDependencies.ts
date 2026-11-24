// What each source of raw_assets/ depends on, so renderArt.ts rebuilds an asset when a file it is made from
// changed, not only when its own source did. One finder per kind of source: it takes the path of a file and
// returns the paths it names, directly. {@link sourcesOf} follows them. Called by renderArt.ts.

import { existsSync, readdirSync, readFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"

import { PARALLAX_SPEC } from "./buildParallax.ts"

/** Where the sources and the assets they are built into lie. */
export interface AssetRoots {
    /** The folder of the sources: raw_assets/. */
    readonly art: string

    /** The folders of the generated and the handwritten assets, seen as one: generated_assets/, assets/. */
    readonly assets: readonly string[]
}

/** The paths a source names, directly: absolute, each one an existing file. */
export type DependencyFinder = (path: string, roots: AssetRoots) => string[]

/** Written in a parallax folder after its painting, so it is no source: it would always make it stale. */
const PREVIEW = "preview.png"

/** `import("x")` and `library("x")`, as Faust reads them. */
const FAUST_IMPORT = /\b(?:import|library)\s*\(\s*"([^"]+)"\s*\)/g

/**
 * A sound or a library of sounds: the files it imports, relative to its own folder. A name that is no file
 * there (`sfx.lib`, `stdfaust.lib`) is a library of the sound effect project, not a source of ours.
 */
const faustFinder: DependencyFinder = path => {
    const found: string[] = []
    for(const match of readFileSync(path, "utf8").matchAll(FAUST_IMPORT)){
        const target = resolve(dirname(path), match[1])
        if(existsSync(target)) found.push(target)
    }
    return found
}

/** A picture document: the documents its shapes lay in, relative to its own folder. */
const pictureFinder: DependencyFinder = path => {
    const document = JSON.parse(readFileSync(path, "utf8")) as { shapes?: { picture?: string }[] }
    const found: string[] = []
    for(const shape of document.shapes ?? []){
        if(shape.picture === undefined) continue
        const target = resolve(dirname(path), shape.picture)
        if(!existsSync(target)) throw new Error(`${path} lays in ${shape.picture}: not at ${target}.`)
        found.push(target)
    }
    return found
}

/**
 * A painting, given by its parallax.json: every file of its folder, and what a layer taken from another
 * painting comes from: the folder that builds it, else the painting under assets/.
 */
const parallaxFinder: DependencyFinder = (path, roots) => {
    const found = filesUnder(dirname(path)).filter(file => basename(file) !== PREVIEW && file !== path)
    const spec = JSON.parse(readFileSync(path, "utf8")) as { layers: { from?: { ora: string } }[] }
    for(const layer of spec.layers){
        if(layer.from === undefined) continue
        const segments = layer.from.ora.split("/")
        const name = basename(segments[segments.length - 1], ".ora")
        const built = join(roots.art, ...segments.slice(0, -1), name, PARALLAX_SPEC)
        const kept = roots.assets.map(root => join(root, ...segments)).find(existsSync)
        const source = existsSync(built) ? built : kept
        if(source === undefined){
            const where = roots.assets.join(", ")
            throw new Error(`${path} takes a layer from ${layer.from.ora}: ${built} is no more there than ${where}.`)
        }
        found.push(source)
    }
    return found
}

/** What no other file is made from: a data json, an image. */
const noFinder: DependencyFinder = () => []

/** The finder of the kind of source a file is. */
export function finderOf(path: string): DependencyFinder {
    if(path.endsWith(".faust.dsp") || path.endsWith(".lib.dsp")) return faustFinder
    if(path.endsWith(".pic.json")) return pictureFinder
    if(basename(path) === PARALLAX_SPEC) return parallaxFinder
    return noFinder
}

/** The file and everything it is made from, however far: what its output is stale against. */
export function sourcesOf(path: string, roots: AssetRoots): string[] {
    const seen = new Set<string>()
    const pending = [resolve(path)]
    while(pending.length > 0){
        const next = pending.pop()!
        if(seen.has(next)) continue
        seen.add(next)
        pending.push(...finderOf(next)(next, roots))
    }
    return [...seen]
}

/** Every file under a folder, at any depth. */
export function filesUnder(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const path = join(directory, entry.name)
        return entry.isDirectory() ? filesUnder(path) : [path]
    })
}
