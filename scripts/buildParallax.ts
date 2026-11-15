// Assembles a parallax painting (.ora) from a folder of raw_assets/ holding a parallax.json: each layer
// rendered by the picture project or taken from another painting, placed, named with its settings, and
// the layer of settings giving the ranges. Called by renderArt.ts. See assets/mecard/parallax/METHOD.md.

import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"
import { pathToFileURL } from "node:url"

import { strFromU8, strToU8, unzipSync, zipSync } from "fflate"

import { type Indexed, indexImage, type Pixels } from "./indexedPng.ts"
import { compileAnim, LAYER_TAGS } from "./transitionAnim.ts"
import type { LayerTag } from "./transitionAnim.ts"

/** What a parallax.json holds. */
interface ParallaxSpec {
    /** The canvas, what is seen at rest, in pixels. */
    readonly size: readonly [number, number]

    /**
     * The settings of the layer `parallax [...]`: `d=20:85,20:40 w=0:0`. Absent for a transition: its layers are
     * named by their frames (`door 0;1;1 0;0;1 m …`) and no settings layer is written.
     */
    readonly ranges?: string

    /**
     * The animation of a transition, one track per line: `leaf: a=0 > a=0 m > hold > a=1`, a track `global` moving every
     * layer. The layers are then named plainly, and their frames are written into their names. See transitionAnim.ts.
     */
    readonly anim?: readonly string[]

    /** The render chain of picture for every layer, so they share their light and contrast; else each document's own. */
    readonly render?: unknown

    /** The layers from the top (the nearest) to the bottom, as a drawing tool lists them. */
    readonly layers: readonly LayerSpec[]

    /** How far a colour may stray when the images are indexed, in OKLab; {@link MAX_ERROR} when absent. */
    readonly maxError?: number
}

interface LayerSpec {
    readonly name: string

    /**
     * What the layer is, required with `anim`: `border` (cut on every edge, none may be seen: a background, an outline) or
     * `object` (its edges are transparent). See transitionAnim.ts.
     */
    readonly tag?: LayerTag

    /** Its own settings, as `w=-0.1` or `d=12,4`, written between brackets after its name. */
    readonly settings?: string

    /** A document of the folder, rendered by picture, its top left corner at `at` on the canvas. */
    readonly picture?: string
    readonly at?: readonly [number, number]

    /** A layer of another painting under assets/, placed as it is there. */
    readonly from?: { readonly ora: string, readonly layer: string }
}

interface Layer { name: string, tag?: LayerTag, x: number, y: number, pixels: Pixels }

export const PARALLAX_SPEC = "parallax.json"

/** How far a colour may stray from the one rendered when indexed, in OKLab: barely seen. */
const MAX_ERROR = 0.02

/** The side of a pixel of the documents in the rendered layers, which the render triples. */
const CELL = 3

/**
 * Build the painting a folder describes into `out`.
 * @param folder - The folder of raw_assets/ holding parallax.json and the documents it names.
 * @param assets - The asset folders (generated_assets/, assets/), seen as one: where the layers taken from other paintings lie.
 * @param picture - The bin/picture.js of the picture project.
 * @param preview - Whether to write a preview.png of the merged image in the folder, a help to create the painting.
 */
export async function buildParallax(folder: string, out: string, assets: readonly string[], picture: string, preview: boolean): Promise<void> {
    const where = join(folder, PARALLAX_SPEC)
    const spec = JSON.parse(readFileSync(where, "utf8")) as ParallaxSpec
    check(spec, where)
    const { encodePng, decodePng } = await import(pathToFileURL(join(dirname(picture), "..", "tools", "png.js")).href)
    const scratch = mkdtempSync(join(tmpdir(), "parallax-"))
    try {
        const render: string[] = []
        if(spec.render !== undefined){
            const chain = join(scratch, "render.json")
            writeFileSync(chain, JSON.stringify(spec.render))
            render.push("-p", chain)
        }
        const rendered: Layer[] = spec.layers.map((layer, index) => {
            const name = layer.settings ? `${layer.name} [${layer.settings}]` : layer.name
            if(layer.picture){
                const png = join(scratch, `${index}.png`)
                execFileSync(process.execPath, [picture, "generate", join(folder, layer.picture), "-o", png, "-s", "1", ...render], { stdio: "pipe" })
                const [x, y] = layer.at ?? [0, 0]
                return { name, tag: layer.tag, x, y, pixels: decodePng(readFileSync(png)) }
            }
            const segments = layer.from!.ora.split("/")
            const found = assets.map(root => join(root, ...segments)).find(existsSync)
            if(found === undefined) throw new Error(`${where} : ${layer.from!.ora} n'est dans aucun de ${assets.join(", ")}.`)
            const source = layerOf(found, layer.from!.layer, decodePng)
            return { ...source, name, tag: layer.tag }
        })
        // The animation written as tracks gives each layer its frames.
        let layers = rendered
        if(spec.anim){
            const [width, height] = spec.size
            const compiled = compileAnim(spec.anim, rendered.map(layer => ({
                name: layer.name, tag: layer.tag!, x: layer.x, y: layer.y, width: layer.pixels.width, height: layer.pixels.height,
            })), { width, height })
            console.log(`  ${basename(folder)} : images clés composées (x;y;z;a, m = le milieu)`)
            for(const line of compiled.table) console.log(`    ${line}`)
            const bugs = compiled.warnings.filter(warning => warning.severity === "bug")
            const boring = compiled.warnings.filter(warning => warning.severity === "boring")
            console.log(`  ${bugs.length} bug(s) visuel(s) (à 0), ${boring.length} pas intéressant`)
            for(const warning of bugs) console.log(`  BUG VISUEL [${warning.key}] ${warning.text}`)
            for(const warning of boring) console.log(`  pas intéressant [${warning.key}] ${warning.text}`)
            if(boring.length >= 2) console.log("  plusieurs « pas intéressant » : bof, à revoir")
            layers = rendered.map((layer, index) => ({ ...layer, name: compiled.names[index] }))
        }
        // Each image brought to its own palette, the fewest colours within the tolerance, 256 at most.
        const tolerance = spec.maxError ?? MAX_ERROR
        const label = basename(folder)
        const indexed = (pixels: Pixels, what: string, cell: number): Indexed => {
            const result = indexImage(pixels, tolerance, cell)
            console.log(`  ${label}/${what} : ${result.colors} couleurs, écart max ${result.error.toFixed(3)}`)
            return result
        }
        const shown = layers.map(layer => ({ layer, image: indexed(layer.pixels, layer.name, CELL) }))
        const [width, height] = spec.size
        // What the game draws: the indexed layers over each other.
        const drawn = merge(width, height, shown.map(({ layer, image }) => ({ ...layer, pixels: image.pixels })))
        const merged = indexed(drawn, "fusion", CELL)
        // The mimetype first and stored, as OpenRaster asks.
        const files: Record<string, Uint8Array|[Uint8Array, { level: 0 }]> = {
            mimetype: [strToU8("image/openraster"), { level: 0 }],
            "stack.xml": strToU8(stackXml(width, height, spec.ranges, layers)),
            "mergedimage.png": merged.png,
            "Thumbnails/thumbnail.png": indexImage(shrink(merged.pixels, 256), tolerance, 1).png,
        }
        // The settings layer: one transparent pixel.
        if(spec.ranges !== undefined) files["data/settings.png"] = encodePng({ width: 1, height: 1, rgba: new Uint8Array(4) })
        shown.forEach(({ image }, index) => files[`data/${index}.png`] = image.png)
        mkdirSync(dirname(out), { recursive: true })
        writeFileSync(out, zipSync(files, { level: 6, mtime: new Date(1980, 0, 1) }))
        // To look at without opening the painting, only while creating it; kept with the sources, not shipped.
        if(preview) writeFileSync(join(folder, "preview.png"), encodePng(drawn))
    } finally {
        rmSync(scratch, { recursive: true, force: true })
    }
}

function check(spec: ParallaxSpec, where: string): void {
    const problem = (message: string): never => {
        throw new Error(`${where} : ${message}`)
    }
    if(!Array.isArray(spec.size) || spec.size.length !== 2) problem("size doit être [largeur, hauteur], en pixels du canevas.")
    if(spec.ranges !== undefined && typeof spec.ranges !== "string") problem("ranges doit être le texte du calque de réglages, comme \"d=20:85,20:40 w=0:0\".")
    if(!Array.isArray(spec.layers) || spec.layers.length === 0) problem("layers doit lister les calques, du plus proche au plus lointain.")
    if(spec.anim !== undefined && !(Array.isArray(spec.anim) && spec.anim.every(line => typeof line === "string"))) problem("anim doit être une liste de textes.")
    if(spec.anim !== undefined && spec.ranges !== undefined) problem("anim est pour une transition : elle n'a pas de ranges.")
    if(spec.maxError !== undefined &&!(typeof spec.maxError === "number" && spec.maxError > 0)) problem("maxError doit être un écart OKLab positif, comme 0.02 (absent : 0.02).")
    spec.layers.forEach((layer, index) => {
        if(typeof layer.name !== "string") problem(`layers[${index}] n'a pas de name.`)
        if(!layer.picture === !layer.from) problem(`layers[${index}] (« ${layer.name} ») doit avoir soit picture (un document du dossier), soit from {ora, layer}.`)
        if(spec.anim !== undefined && !LAYER_TAGS.includes(layer.tag as LayerTag)){
            problem(`layers[${index}] (« ${layer.name} ») doit avoir un tag parmi ${LAYER_TAGS.join(", ")} (border : coupé sur tous ses bords, object : bords transparents).`)
        }
    })
}

/** A layer of a painting under assets/, by its full name. */
function layerOf(path: string, name: string, decodePng: (bytes: Uint8Array) => Pixels): Omit<Layer, "name"> {
    const files = unzipSync(readFileSync(path))
    const stack = strFromU8(files["stack.xml"])
    for(const [, attributes] of stack.matchAll(/<layer\b([^>]*?)\/?>/g)){
        const get = (key: string) => new RegExp(`\\b${key}="([^"]*)"`).exec(attributes)?.[1]
        if(get("name") !== name) continue
        return { x: Number(get("x") ?? 0), y: Number(get("y") ?? 0), pixels: decodePng(files[get("src")!]) }
    }
    throw new Error(`${path} n'a pas de calque « ${name} ».`)
}

function stackXml(width: number, height: number, ranges: string|undefined, layers: readonly Layer[]): string {
    const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
    const tag = (src: string, name: string, x: number, y: number) =>
        `<layer src="${src}" name="${escape(name)}" x="${x}" y="${y}" opacity="1.0" visibility="visible" composite-op="svg:src-over" />`
    return `<?xml version="1.0" encoding="UTF-8"?>\n<image w="${width}" h="${height}"><stack>`
        + (ranges === undefined ? "" : tag("data/settings.png", `parallax [${ranges}]`, 0, 0))
        + layers.map((layer, index) => tag(`data/${index}.png`, layer.name, layer.x, layer.y)).join("")
        + "</stack></image>\n"
}

/** The layers drawn over each other on the canvas, the bottom one first. */
function merge(width: number, height: number, layers: readonly Layer[]): Pixels {
    const rgba = new Uint8Array(width * height * 4)
    for(const layer of [...layers].reverse()){
        const { pixels } = layer
        for(let y = 0; y < pixels.height; y++){
            const cy = y + layer.y
            if(cy < 0 || cy >= height) continue
            for(let x = 0; x < pixels.width; x++){
                const cx = x + layer.x
                if(cx < 0 || cx >= width) continue
                const from = (x + y * pixels.width) * 4, to = (cx + cy * width) * 4
                const alpha = pixels.rgba[from + 3] / 255
                if(alpha === 0) continue
                const below = rgba[to + 3] / 255
                const outAlpha = alpha + below * (1 - alpha)
                for(let c = 0; c < 3; c++){
                    rgba[to + c] = Math.round((pixels.rgba[from + c] * alpha + rgba[to + c] * below * (1 - alpha)) / outAlpha)
                }
                rgba[to + 3] = Math.round(outAlpha * 255)
            }
        }
    }
    return { width, height, rgba }
}

/** The image shrunk so its longest side is at most `side`, nearest pixel. */
function shrink(image: Pixels, side: number): Pixels {
    const factor = Math.max(1, Math.max(image.width, image.height) / side)
    const width = Math.round(image.width / factor), height = Math.round(image.height / factor)
    const rgba = new Uint8Array(width * height * 4)
    for(let y = 0; y < height; y++){
        for(let x = 0; x < width; x++){
            const from = (Math.floor(x * factor) + Math.floor(y * factor) * image.width) * 4
            rgba.set(image.rgba.subarray(from, from + 4), (x + y * width) * 4)
        }
    }
    return { width, height, rgba }
}
