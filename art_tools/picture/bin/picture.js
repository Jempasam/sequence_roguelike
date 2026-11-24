#!/usr/bin/env node
import { writeFileSync } from "node:fs"
import path from "node:path"
import {
    Picture, LoadError, DOCUMENT, FILTERS, FILTER_LIST, RENDER, PRESETS, STEPS,
    renderDocument, toDocument, withOverrides,
} from "../dist/index.js"
import { encodePng, decodePng } from "../tools/png.js"
import { buildShapes, PATTERNS } from "../tools/shapes.js"
import { importImage } from "../tools/importImage.js"
import { readFileSync } from "node:fs"
import { resolveText, readJsonFile } from "../tools/loadText.js"

/**
 * The headless face of the library: open nothing, draw nothing on screen, just load a document and
 * write a PNG.
 *
 * Every option that carries a value goes through `resolveText` (`tools/loadText.js`) — inline JSON,
 * a path, or a bare name, told apart by the shape of the string. The resolved values are merged
 * into the document **as data**, and the whole thing is loaded once: an override that makes no
 * sense fails with the same message it would have produced from inside the file.
 */

const SHAPES_PATH = new URL("../editor/shapes.json", import.meta.url)

/** @returns {{[name: string]: any[]}} */
function loadShapes(){
    return /** @type {any} */ (readJsonFile(SHAPES_PATH.pathname.replace(/^\/([A-Za-z]:)/, "$1")))
}

/** Turn `["render","dragon","-p","shaded"]` into positionals plus a flag bag. */
function parseArgs(argv){
    /** @type {string[]} */ const positional = []
    /** @type {{[name: string]: string|undefined}} */ const flags = {}
    const alias = {
        p: "render-chain", f: "filter-list", e: "effect",
        l: "light", s: "scale", o: "out", h: "help",
    }
    for(let i = 0; i < argv.length; i++){
        const arg = argv[i]
        if(arg.startsWith("--")) flags[arg.slice(2)] = argv[++i]
        else if(arg.startsWith("-") && arg.length > 1) flags[alias[arg.slice(1)] ?? arg.slice(1)] = argv[++i]
        else positional.push(arg)
    }
    return {positional, flags}
}

/** @param {string} message @returns {never} */
function fail(message){
    console.error(message)
    process.exit(1)
}

/** @param {string} name */
function libraryShape(name){
    const shapes = loadShapes()
    if(!(name in shapes)) fail(`unknown shape "${name}". Try: picture list shapes`)
    return new Picture(...shapes[name])
}

/**
 * The four overrides, resolved from text but NOT yet loaded — they are merged into the raw
 * document and loaded with it.
 */
function overridesFrom(flags){
    /** @type {{render?: unknown, filters?: unknown, effect?: unknown, light?: number}} */
    const overrides = {}
    if(flags["render-chain"] !== undefined) overrides.render = resolveText(flags["render-chain"], {what: "--render-chain"})
    if(flags["filter-list"] !== undefined) overrides.filters = resolveText(flags["filter-list"], {what: "--filter-list"})
    if(flags.effect !== undefined) overrides.effect = resolveText(flags.effect, {what: "--effect"})
    if(flags.light !== undefined){
        const light = Number(flags.light)
        if(!Number.isFinite(light)) fail(`--light is an angle in degrees, got "${flags.light}"`)
        overrides.light = light
    }
    return overrides
}

function scaleFrom(flags){
    const scale = flags.scale === undefined ? 8 : Number(flags.scale)
    if(!Number.isInteger(scale) || scale < 1) fail(`--scale must be a positive whole number, got "${flags.scale}"`)
    return scale
}

/** Load a raw document with the overrides folded in, and run it. */
function bake(raw, flags, base = "."){
    if(raw && raw.shapes) raw = buildShapes(raw, base)
    return renderDocument(DOCUMENT.load(withOverrides(raw, overridesFrom(flags))))
}

/** Everything ends the same way: bytes to a file, one line to the terminal. */
function write(out, pixels, scale, note){
    writeFileSync(out, encodePng(pixels, scale))
    console.log(`${out} — ${pixels.width}x${pixels.height} px at x${scale}${note ? `, ${note}` : ""}`)
}

/** Strip the directories and both halves of a composed extension. @param {string} file */
function stem(file){
    return file.split(/[\\/]/).pop().replace(/\.pic\.json$/, "").replace(/\.json$/, "")
}

const USAGE = `picture — render depth-mapped pictures to PNG, headless

  picture generate <file.pic.json> [options]   render a document
  picture render <shape> [options]             render one shape of the built-in library
  picture convert <shape> [-o file.pic.json]   turn a library shape into an editable document
  picture sheet [options]                      every library shape, one contact sheet
  picture shapes <file.json> [-o file.pic.json] build a shapes document into an editable document
  picture import <image.png> [-o file.pic.json] [--width 32] [--materials 4] [--key #rrggbb]
                 [--tolerance 40] [--depth 3,8] [--crop x,y,w,h]  an image to a document: shrunk, 4 materials, brightness as relief
  picture list [shapes|filters|presets|steps|patterns]
  picture schema [document|filters|render]     JSON Schema, for an editor or for the docs

Options
  -p, --render-chain <value>   the shading chain: a preset name, a step list, or {preset, light}
  -f, --filter-list <value>    replace the document's filters
  -e, --effect <value>         append one filter to the document's own
  -l, --light <degrees>        the chain's light direction
  -s, --scale <n>              pixel magnification            (default: 8)
  -o, --out <file>             output path

Any value above may be written three ways, told apart by its first characters:
  furry                        a bare name — the default instance of that filter, preset or step
  {"id":"drippy","dy":2}       inline JSON
  ./my-filters.json            a path — ./ ../ / ~/ or C:\\ , either slash

A .pic.json document carries:
  "palette"  up to 36 materials (the web editor loads 4) — colour, alpha, light emission, reflectiveness
  "pixels"   "materials" rows ("0".."3", "." empty) and optional "depth" rows ("0".."9","a",".")
  "filters"  optional, applied in order, before shading
  "render"   the shading chain: "shaded", a list of steps, or {"preset": …, "light": 45}

A document may give "size" and "shapes" instead of "pixels" (see tools/shapes.js): boxes, ellipses,
polygons and lines, each with a material or a pattern fill, a depth [edge, heart] and a relief
(flat, bevel, round-x, round-y, dome). generate builds it on the fly.`

const {positional, flags} = parseArgs(process.argv.slice(2))
const [command, target] = positional

if(flags.help !== undefined || command === undefined || command === "help"){
    console.log(USAGE)
    process.exit(command === undefined ? 1 : 0)
}

try{
    switch(command){
        case "list": {
            const what = target ?? "shapes"
            const names = {
                shapes: () => Object.keys(loadShapes()),
                filters: () => FILTERS.ids,
                presets: () => Object.keys(PRESETS),
                steps: () => STEPS.ids,
                patterns: () => Object.entries(PATTERNS).map(([name, it]) => `${name} — ${it.describe}`),
            }[what]
            if(!names) fail("list what? shapes, filters, presets, steps or patterns")
            console.log(names().join("\n"))
            break
        }

        case "schema": {
            const what = target ?? "document"
            const loader = {document: DOCUMENT, filters: FILTER_LIST, render: RENDER}[what]
            if(!loader) fail("schema of what? document, filters or render")
            const text = JSON.stringify({
                $schema: "https://json-schema.org/draft/2020-12/schema",
                ...loader.schema(),
            }, null, 2)
            if(flags.out) writeFileSync(flags.out, text + "\n")
            else console.log(text)
            break
        }

        case "generate": {
            if(!target) fail("generate what? A path to a .pic.json document.")
            const pixels = bake(readJsonFile(target), flags, path.dirname(target)).toPixels()
            write(flags.out ?? `${stem(target)}.png`, pixels, scaleFrom(flags))
            break
        }

        case "render": {
            if(!target) fail("render what? Try: picture list shapes")
            const pixels = bake(toDocument(libraryShape(target)), flags).toPixels()
            write(flags.out ?? `${stem(target)}.png`, pixels, scaleFrom(flags))
            break
        }

        case "convert": {
            if(!target) fail("convert what? Try: picture list shapes")
            const out = flags.out ?? `${stem(target)}.pic.json`
            const shape = libraryShape(target)
            const document = toDocument(shape)
            writeFileSync(out, JSON.stringify(document, null, 2) + "\n")
            console.log(`${out} — ${shape.width}x${shape.height}, ${document.palette?.length ?? 0} materials`)
            break
        }

        case "shapes": {
            if(!target) fail("shapes of what? A path to a document carrying size and shapes.")
            const out = flags.out ?? `${stem(target)}.pic.json`
            const document = buildShapes(readJsonFile(target), path.dirname(target))
            writeFileSync(out, JSON.stringify(document, null, 2) + "\n")
            console.log(`${out} — ${document.size[0]}x${document.size[1]}`)
            break
        }

        case "import": {
            if(!target) fail("import what? A path to a PNG image.")
            const number = (/** @type {string} */ name) => {
                if(flags[name] === undefined) return undefined
                const value = Number(flags[name])
                if(!Number.isFinite(value)) fail(`--${name} is a number, got "${flags[name]}"`)
                return value
            }
            let key = null
            if(flags.key !== undefined){
                const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(flags.key)
                if(!match) fail(`--key is a colour #rrggbb, got "${flags.key}"`)
                key = /** @type {[number,number,number]} */ (match.slice(1).map(h => parseInt(h, 16)))
            }
            let depth
            if(flags.depth !== undefined){
                depth = flags.depth.split(",").map(Number)
                if(depth.length !== 2 || depth.some(d => !Number.isFinite(d) || d < 0 || d > 10)) fail(`--depth is dark,bright between 0 and 10, got "${flags.depth}"`)
            }
            let image = decodePng(readFileSync(target))
            if(flags.crop !== undefined){
                const [cx, cy, cw, ch] = flags.crop.split(",").map(Number)
                if([cx, cy, cw, ch].some(v => !Number.isInteger(v) || v < 0) || cw === 0 || ch === 0 || cx + cw > image.width || cy + ch > image.height){
                    fail(`--crop is x,y,w,h inside the ${image.width}x${image.height} image, got "${flags.crop}"`)
                }
                const rgba = new Uint8Array(cw * ch * 4)
                for(let y = 0; y < ch; y++) rgba.set(image.rgba.subarray(((cy + y) * image.width + cx) * 4, ((cy + y) * image.width + cx + cw) * 4), y * cw * 4)
                image = {width: cw, height: ch, rgba}
            }
            const document = importImage(image, {
                width: number("width"),
                materials: number("materials"),
                tolerance: number("tolerance"),
                key,
                depth: /** @type {any} */ (depth),
            })
            const out = flags.out ?? `${stem(target).replace(/\.png$/i, "")}.pic.json`
            writeFileSync(out, JSON.stringify(document, null, 2) + "\n")
            console.log(`${out} — ${document.size[0]}x${document.size[1]}, ${document.palette.length} materials`)
            break
        }

        case "sheet": {
            const scale = scaleFrom(flags)
            const shapes = loadShapes()
            const names = Object.keys(shapes)
            const rendered = names.map(name => bake(toDocument(new Picture(...shapes[name])), flags).toPixels())

            // One cell per shape, sized on the largest, laid out as square a grid as the count allows.
            const cell = Math.max(...rendered.map(it => Math.max(it.width, it.height))) + 2
            const columns = Math.ceil(Math.sqrt(names.length))
            const rows = Math.ceil(names.length / columns)
            const sheet = {
                width: columns*cell,
                height: rows*cell,
                rgba: new Uint8Array(columns*cell * rows*cell * 4),
            }
            rendered.forEach((pixels, index) => {
                const originX = (index % columns)*cell + Math.floor((cell - pixels.width)/2)
                const originY = Math.floor(index / columns)*cell + Math.floor((cell - pixels.height)/2)
                for(let y = 0; y < pixels.height; y++){
                    for(let x = 0; x < pixels.width; x++){
                        const from = (x + y*pixels.width)*4
                        const to = ((originX + x) + (originY + y)*sheet.width)*4
                        sheet.rgba.set(pixels.rgba.subarray(from, from + 4), to)
                    }
                }
            })
            write(flags.out ?? "sheet.png", sheet, scale, `${names.length} shapes`)
            break
        }

        default:
            fail(`unknown command "${command}"\n\n${USAGE}`)
    }
}
catch(cause){
    // A document that does not hold up is a user error, not a crash: one sentence, and it already
    // names the field at fault.
    fail(cause instanceof LoadError || cause instanceof Error ? cause.message : String(cause))
}
