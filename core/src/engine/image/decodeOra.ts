import { strFromU8, unzipSync } from "fflate"

import { decodePng } from "./decodePng"
import { OraError } from "./OraError"
import type { PixelData } from "./PixelData"
import { PngError } from "./PngError"

/** What the `mimetype` entry of an OpenRaster file holds. */
const MIMETYPE = "image/openraster"

/** A layer of an OpenRaster image, its pixels placed on the canvas. */
export interface OraLayer {
    /** Its name in the drawing tool, which the game finds it by. */
    readonly name: string

    /** Where its top left corner lies on the canvas, in pixels. */
    readonly x: number
    readonly y: number

    /** How opaque it is drawn, from 0 to 1. */
    readonly opacity: number

    /** Is it shown in the drawing tool? A hidden layer is kept, for a game that shows it on its own. */
    readonly visible: boolean

    /** Its pixels, as large as what it holds, not as the canvas. */
    readonly pixels: PixelData
}

/** An image made of named layers, read from an OpenRaster file. */
export interface OraImage {
    /** The size of the canvas, in pixels. */
    readonly width: number
    readonly height: number

    /** Its layers, from the top one to the bottom one, as the drawing tool lists them. */
    readonly layers: readonly OraLayer[]
}

/**
 * Decode an OpenRaster file (`.ora`, as Krita, MyPaint or GIMP save it): a zip holding a PNG by layer and
 * `stack.xml`, which names and places them.
 *
 * Only a flat stack is accepted: a group of layers would need a choice of how its offset and opacity
 * compose, which the game makes nowhere. The merged image and the thumbnail are ignored.
 *
 * @param bytes - The content of the file.
 * @param name - The name of the image, only used in error messages.
 * @throws {@link OraError} When the bytes are not an OpenRaster, or one with groups or a refused PNG.
 */
export function decodeOra(bytes: Uint8Array, name: string): OraImage {
    const files = filesOf(bytes, name)
    const mimetype = files.mimetype ? strFromU8(files.mimetype).trim() : null
    if(mimetype !== MIMETYPE) throw new OraError("invalid", `${name} is not an OpenRaster file.`)
    const stackFile = files["stack.xml"]
    if(!stackFile) throw new OraError("invalid", `${name} has no stack.xml.`)
    const stack = strFromU8(stackFile)
    const image = /<image\b([^>]*)>/.exec(stack)
    if(!image) throw new OraError("invalid", `${name} has no <image> in its stack.xml.`)
    if((stack.match(/<stack\b/g) ?? []).length > 1){
        throw new OraError("unsupported", `${name} has groups of layers. Flatten them into layers.`)
    }
    const size = attributesOf(image[1])
    const layers = [...stack.matchAll(/<layer\b([^>]*?)\/?>/g)].map(tag => {
        return layerOf(attributesOf(tag[1]), files, name)
    })
    return {
        width: numberOf(size, "w", null, name),
        height: numberOf(size, "h", null, name),
        layers,
    }
}


//// Parts ////

/** The entries of the zip, by their path. */
function filesOf(bytes: Uint8Array, name: string): Record<string, Uint8Array|undefined> {
    try {
        return unzipSync(bytes)
    } catch(cause){
        throw new OraError("invalid", `${name} is not a valid zip, which an OpenRaster file is.`, { cause })
    }
}

function layerOf(
    attributes: ReadonlyMap<string, string>, files: Record<string, Uint8Array|undefined>, name: string,
): OraLayer {
    const source = attributes.get("src")
    if(!source) throw new OraError("invalid", `${name} has a layer without src.`)
    const png = files[source]
    if(!png) throw new OraError("invalid", `${name} lacks ${source}, which its stack.xml lists.`)
    let pixels: PixelData
    try {
        pixels = decodePng(png, `${name}/${source}`)
    } catch(error){
        if(error instanceof PngError) throw new OraError(error.reason, error.message, { cause: error })
        throw error
    }
    return {
        name: attributes.get("name") ?? "",
        x: numberOf(attributes, "x", 0, name),
        y: numberOf(attributes, "y", 0, name),
        opacity: numberOf(attributes, "opacity", 1, name),
        visible: attributes.get("visibility") !== "hidden",
        pixels,
    }
}


//// XML ////

/** The XML entities a value may hold, and the text each stands for. */
const ENTITIES: Readonly<Record<string, string>> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" }

/** The attributes of a tag, by name, their entities decoded. */
function attributesOf(text: string): Map<string, string> {
    const attributes = new Map<string, string>()
    for(const [, key, value] of text.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)){
        attributes.set(key, unescaped(value))
    }
    return attributes
}

/** An attribute read as a number, its fallback when absent, none meaning it is required. */
function numberOf(
    attributes: ReadonlyMap<string, string>, key: string, fallback: number|null, name: string,
): number {
    const text = attributes.get(key)
    if(text === undefined && fallback !== null) return fallback
    const value = Number(text)
    if(text === undefined || text.trim() === "" || !Number.isFinite(value)){
        throw new OraError("invalid", `${name} has ${key}="${text ?? ""}" in its stack.xml, not a number.`)
    }
    return value
}

/** A text of XML with its predefined entities and its character references decoded. */
function unescaped(text: string): string {
    return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, entity: string) => {
        const lower = entity.toLowerCase()
        if(lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16))
        if(lower.startsWith("#")) return String.fromCodePoint(parseInt(lower.slice(1), 10))
        return ENTITIES[lower] ?? whole
    })
}
