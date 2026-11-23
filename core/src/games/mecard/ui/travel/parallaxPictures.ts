import type { Assets } from "../../../../engine/assets"
import type { OraLayer, PixelData } from "../../../../engine/image"
import type { ParallaxAxes, ParallaxPlace, ParallaxViewport } from "../../../../engine/ui"

import type { ParallaxSource } from "../look/visualPath"

/**
 * A layer of a parallax loaded: its pixels, where it lies at rest, and what its painting set for it, none
 * for what it leaves to the parallax.
 */
export interface ParallaxPicture {
    /** Its name, without its settings: that of its layer in the painting, `n°<rank>` for a picture apart. */
    readonly name: string

    readonly pixels: PixelData

    /** Where it lies at rest, none to be fitted on its own. */
    readonly place: ParallaxPlace|null

    /** How far it follows the pointer, in virtual pixels, along each axis. */
    readonly depth: ParallaxAxes|null

    /** How strongly it bends as it moves, along each axis. */
    readonly warp: ParallaxAxes|null
}

/** A value of the farthest and the nearest layers of a scene, the others between them. */
export interface LayerRange {
    readonly far: number
    readonly near: number
}

/** A value of the layers of a scene along each axis, from the farthest to the nearest. */
export interface SceneRanges {
    readonly x: LayerRange
    readonly y: LayerRange
}

/** The ranges a painting sets for its layers, none for those it leaves to the game. */
export interface PaintingRanges {
    readonly depth: SceneRanges|null
    readonly warp: SceneRanges|null
}

/** The layers of a parallax loaded, the farthest first, its ranges, and what could not be read of their settings. */
export interface ParallaxPictures {
    readonly layers: readonly ParallaxPicture[]

    /** What the layer of settings of the painting sets, nothing for pictures apart. */
    readonly ranges: PaintingRanges

    /** What its canvas shows at rest, in the pixels its layers are placed in, none for pictures apart. */
    readonly viewport: ParallaxViewport|null
    readonly warnings: readonly string[]
}

/**
 * The name of the layer of settings of a painting, before its brackets: a layer, empty, that is not drawn
 * and whose name gives the ranges of the layers, as `parallax [d=20:85,20:40 w=0:0.5]`.
 */
export const SETTINGS_LAYER = "parallax"

const NO_RANGES: PaintingRanges = { depth: null, warp: null }

/** What the name of a layer of a painting says: its name, then its settings, as `trees [d=12,4 w=0.5,-0.2]`. */
export interface LayerName {
    readonly name: string
    readonly depth: ParallaxAxes|null
    readonly warp: ParallaxAxes|null

    /** What could not be read, each saying what was expected: those settings are left out. */
    readonly warnings: readonly string[]
}

/** The settings at the end of the name of a layer, between brackets. */
const SETTINGS = /^(.*?)\s*\[([^\]]*)\]\s*$/

/** The settings a layer name may hold, by their key, and what each is. */
const KEYS: Readonly<Record<string, string>> = { d: "la distance", w: "la déformation" }

/**
 * Read the name of a layer of a painting: its name, then, between brackets at its end, `d=X` or `d=X,Y` for
 * how far it follows the pointer, `w=X` or `w=X,Y` for how strongly it bends, each optional, a single value
 * for both axes, separated by spaces.
 */
export function parseLayerName(full: string): LayerName {
    const match = SETTINGS.exec(full)
    if(!match) return { name: full, depth: null, warp: null, warnings: [] }
    const settings: Record<string, ParallaxAxes> = {}
    const warnings: string[] = []
    for(const word of match[2].split(/\s+/).filter(Boolean)){
        const [key, value, ...rest] = word.split("=")
        const axes = value === undefined || rest.length > 0 ? null : axesOf(value)
        if(!(key in KEYS)){
            warnings.push(`calque « ${full} » : « ${word} » inconnu, attendu d=X,Y (distance) ou w=X,Y (déformation).`)
        } else if(!axes){
            warnings.push(`calque « ${full} » : « ${word} » illisible pour ${KEYS[key]}, attendu ${key}=X ou ${key}=X,Y.`)
        } else {
            settings[key] = axes
        }
    }
    return { name: match[1], depth: settings.d ?? null, warp: settings.w ?? null, warnings }
}

/** The settings of a layer written back in its name, as {@link parseLayerName} reads them. */
export function layerName(name: string, depth: ParallaxAxes|null, warp: ParallaxAxes|null): string {
    const write = (key: string, axes: ParallaxAxes) => `${key}=${axes.x === axes.y ? axes.x : `${axes.x},${axes.y}`}`
    const settings = [depth && write("d", depth), warp && write("w", warp)].filter(Boolean)
    return settings.length > 0 ? `${name} [${settings.join(" ")}]` : name
}

/** Is it the name of the layer of settings, whatever its brackets hold? */
export function isSettingsLayer(full: string): boolean {
    const match = SETTINGS.exec(full)
    return (match ? match[1] : full).trim().toLowerCase() === SETTINGS_LAYER
}

/**
 * Read the name of the layer of settings of a painting: between brackets, `d=F:N` or `d=F:N,F:N` for how
 * far its layers follow the pointer, from the farthest to the nearest, one range for both axes or one for
 * each, `w=` alike for how strongly they bend, each optional.
 */
export function parseRangesName(full: string): PaintingRanges & { readonly warnings: readonly string[] } {
    const match = SETTINGS.exec(full)
    if(!match) return { ...NO_RANGES, warnings: [] }
    const settings: Record<string, SceneRanges> = {}
    const warnings: string[] = []
    for(const word of match[2].split(/\s+/).filter(Boolean)){
        const [key, value, ...rest] = word.split("=")
        const ranges = value === undefined || rest.length > 0 ? null : rangesOf(value)
        if(!(key in KEYS)){
            warnings.push(`calque « ${full} » : « ${word} » inconnu, attendu d=F:N,F:N (distances) ou w=F:N,F:N (déformations).`)
        } else if(!ranges){
            warnings.push(`calque « ${full} » : « ${word} » illisible pour ${KEYS[key]}, attendu ${key}=loin:près ou ${key}=loin:près,loin:près (X puis Y).`)
        } else {
            settings[key] = ranges
        }
    }
    return { depth: settings.d ?? null, warp: settings.w ?? null, warnings }
}

/** The name of the layer of settings giving those ranges, as {@link parseRangesName} reads it. */
export function rangesName(depth: SceneRanges, warp: SceneRanges): string {
    const range = ({ far, near }: LayerRange) => `${far}:${near}`
    const write = (key: string, { x, y }: SceneRanges) => {
        const same = x.far === y.far && x.near === y.near
        return `${key}=${same ? range(x) : `${range(x)},${range(y)}`}`
    }
    return `${SETTINGS_LAYER} [${write("d", depth)} ${write("w", warp)}]`
}

/** A range for both axes, or one for each: `5:48` or `5:48,2:20`, none when it is not that. */
function rangesOf(text: string): SceneRanges|null {
    const parts = text.split(",")
    if(parts.length > 2) return null
    const ranges = parts.map(part => {
        const ends = part.split(":")
        if(ends.length !== 2 || ends.some(end => end.trim() === "")) return null
        const [far, near] = ends.map(Number)
        return Number.isFinite(far) && Number.isFinite(near) ? { far, near } : null
    })
    if(ranges.some(range => range === null)) return null
    const [x, y] = ranges as LayerRange[]
    return { x, y: y ?? x }
}

/** A value for both axes, or one for each: `3` or `3,-1`, none when it is not that. */
function axesOf(text: string): ParallaxAxes|null {
    const parts = text.split(",")
    if(parts.length > 2 || parts.some(part => part.trim() === "")) return null
    const values = parts.map(Number)
    if(values.some(value => !Number.isFinite(value))) return null
    return { x: values[0], y: values[1] ?? values[0] }
}

/**
 * Load the layers of a parallax, the farthest first: pictures apart, each fitted on its own, or the
 * visible layers of a painting, the bottom one the farthest, placed as on its canvas, the canvas being what
 * is seen at rest, their opacity applied, their settings read from their names, and the ranges its layer
 * of settings gives, that layer not drawn.
 *
 * @throws {@link AssetError} When a file cannot be read.
 */
export async function loadParallaxPictures(assets: Assets, source: ParallaxSource): Promise<ParallaxPictures> {
    if("images" in source){
        const pictures = await Promise.all(source.images.map(path => assets.image(path)))
        return {
            layers: pictures.map((pixels, index) => ({
                name: `n°${index + 1}`, pixels, place: null, depth: null, warp: null,
            })),
            ranges: NO_RANGES,
            viewport: null,
            warnings: [],
        }
    }
    const { width, height, layers } = await assets.layeredImage(source.painting)
    const warnings: string[] = []
    // The layer of settings, shown or not, is read and never drawn; the first one counts.
    const settings = layers.filter(layer => isSettingsLayer(layer.name))
    const read = settings[0] ? parseRangesName(settings[0].name) : { ...NO_RANGES, warnings: [] }
    warnings.push(...read.warnings.map(warning => `${source.painting}, ${warning}`))
    if(settings.length > 1){
        warnings.push(`${source.painting} : ${settings.length} calques « ${SETTINGS_LAYER} [...] », seul le plus haut compte.`)
    }
    const ranges = { depth: read.depth, warp: read.warp }
    const drawn = layers.filter(layer => layer.visible && !isSettingsLayer(layer.name))
    const pictures = drawn.reverse().map(layer => {
        const read = parseLayerName(layer.name)
        warnings.push(...read.warnings.map(warning => `${source.painting}, ${warning}`))
        return {
            name: read.name,
            pixels: faded(layer),
            place: { x: layer.x, y: layer.y, width: layer.pixels.width, height: layer.pixels.height },
            depth: read.depth,
            warp: read.warp,
        }
    })
    return { layers: pictures, ranges, viewport: { width, height }, warnings }
}

/** The pixels of a layer, its opacity multiplying their alpha. */
function faded(layer: OraLayer): PixelData {
    if(layer.opacity >= 1) return layer.pixels
    const data = Uint8Array.from(layer.pixels.data)
    for(let index = 3; index < data.length; index += 4) data[index] = Math.round(data[index] * layer.opacity)
    return { width: layer.pixels.width, height: layer.pixels.height, data }
}
