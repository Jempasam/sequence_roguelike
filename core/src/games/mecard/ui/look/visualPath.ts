import { ASSET_PATHS, AssetError } from "../../../../engine/assets"
import type { AssetPath, Assets, ImagePath, JsonPath, LayeredImagePath } from "../../../../engine/assets"
import type { PixelData } from "../../../../engine/image"
import { Color } from "../../../../engine/math"
import type { Visual } from "../../sim/base/Visual"

/**
 * The file a visual names, if there is one: the one place where a key of the simulation becomes a path of
 * the assets. Nothing says the file exists, so what loads it must cope with its absence.
 */
export function pathOf(visual: Visual|string): ImagePath {
    const key = typeof visual === "string" ? visual : visual.visual
    return `mecard/${key}.png` as ImagePath
}

/** The folder of the transitions: the root of the keys of the visuals that name one. */
const TRANSITIONS_ROOT = "mecard/transitions"

/** The folder of the parallaxes: the root of the keys of the visuals that name one. */
const PARALLAX_ROOT = "mecard/parallax"

/**
 * The painting of the transition a visual names, its key being a name under `mecard/transitions/`: where
 * that key becomes a path, the file may not exist.
 */
export function transitionPath(visual: Visual|string): LayeredImagePath {
    const key = typeof visual === "string" ? visual : visual.visual
    return `${TRANSITIONS_ROOT}/${key}.ora` as LayeredImagePath
}

/** The keys of the transitions the game ships, one for each `.ora` under `mecard/transitions/`. */
export function shippedTransitions(shipped: readonly AssetPath[] = ASSET_PATHS): string[] {
    const keys: string[] = []
    for(const path of shipped){
        if(path.startsWith(`${TRANSITIONS_ROOT}/`) && path.endsWith(".ora")){
            const key = path.slice(TRANSITIONS_ROOT.length + 1, -".ora".length)
            if(!key.includes("/")) keys.push(key)
        }
    }
    return keys.sort()
}

/** How a transition of a visual is played: the hue its coloration gives to every picture, none for none. */
export function transitionTintOf(visual: Visual): Color|null {
    const coloration = visual.coloration
    return coloration ? new Color(...coloration) : null
}

/** Where the layers of a parallax come from: pictures apart, the farthest first, or one layered painting. */
export type ParallaxSource =
    | { readonly images: readonly ImagePath[] }
    | { readonly painting: LayeredImagePath }

/** The number a picture of a parallax is named with, to sort them: `2.png` before `10.png`. */
function rankOf(path: string): number {
    const name = path.slice(path.lastIndexOf("/") + 1, -".png".length)
    const rank = Number(name)
    return Number.isFinite(rank) ? rank : Number.POSITIVE_INFINITY
}

/**
 * The files of the parallax a visual names, its key being a name under `mecard/parallax/`: `<key>.ora` when
 * the game ships it, else the pictures right in the folder `<key>/`, by the number they are named with, the
 * first the farthest.
 *
 * @param shipped - The files the game ships, all of them unless a test says otherwise.
 * @throws {@link AssetError} When the game ships neither, naming both.
 */
export function parallaxSource(visual: Visual|string, shipped: readonly AssetPath[] = ASSET_PATHS): ParallaxSource {
    const key = typeof visual === "string" ? visual : visual.visual
    const painting = `${PARALLAX_ROOT}/${key}.ora`
    if(shipped.includes(painting as AssetPath)) return { painting: painting as LayeredImagePath }
    const folder = `${PARALLAX_ROOT}/${key}/`
    const images = shipped.filter((path): path is ImagePath => {
        return path.startsWith(folder) && path.endsWith(".png") && !path.slice(folder.length).includes("/")
    })
    if(images.length === 0){
        throw new AssetError(folder, "unreadable", `ni ${painting}, ni image .png dans ${folder} : ajoute l'un ou l'autre sous assets/ puis lance npm run assets`)
    }
    return { images: [...images].sort((a, b) => rankOf(a) - rankOf(b) || a.localeCompare(b)) }
}

/** The keys of the parallaxes the game ships: each `.ora` and each folder of pictures under `mecard/parallax/`. */
export function shippedParallaxes(shipped: readonly AssetPath[] = ASSET_PATHS): string[] {
    const keys = new Set<string>()
    for(const path of shipped){
        const match = /^mecard\/parallax\/([^/]+?)(?:\.ora|\/[^/]+\.png)$/.exec(path)
        if(match) keys.add(match[1])
    }
    return [...keys].sort()
}

/** Each distinct picture of some visuals, once, by its key. */
export function distinctPictures(visuals: readonly Visual[]): Visual[] {
    return [...new Map(visuals.map(each => [each.visual, each])).values()]
}

/**
 * The keys of the pictures the game ships in a folder of `mecard/`, like `units`, and in the folders under it:
 * `units/wolf` for `mecard/units/wolf.png`, `units/test/walls/brick` for the one in a folder of a theme, sorted.
 */
export function shippedPictures(folder: string, shipped: readonly AssetPath[] = ASSET_PATHS): string[] {
    const prefix = `mecard/${folder}/`
    const keys: string[] = []
    for(const path of shipped){
        if(path.startsWith(prefix) && path.endsWith(".png")){
            keys.push(`${folder}/${path.slice(prefix.length, -".png".length)}`)
        }
    }
    return keys.sort()
}

/** The file of data a picture may come with, by the key of the picture: `mecard/<key>.json`. */
export function dataPathOf(visual: Visual|string): JsonPath {
    const key = typeof visual === "string" ? visual : visual.visual
    return `mecard/${key}.json` as JsonPath
}

/** A picture loaded, with what its file of data says, none when it has none. */
export interface LoadedPicture {
    readonly key: string
    readonly pixels: PixelData
    readonly data: unknown
}

/**
 * The pictures that keys name, as far as they exist: a key whose file cannot be read is left out, and the
 * screen draws what the visual says in its stead. Each comes with the JSON file of the same name when the
 * game ships one; a picture without it has none, a JSON that is not valid fails.
 *
 * @param shipped - The files the game ships, all of them unless a test says otherwise.
 * @throws {@link AssetError} When a file of data cannot be read or is not JSON.
 */
export async function loadPictures(
    assets: Assets, keys: readonly string[], shipped: readonly AssetPath[] = ASSET_PATHS,
): Promise<LoadedPicture[]> {
    const loaded = await Promise.all(keys.map(async(key): Promise<LoadedPicture|null> => {
        let pixels: PixelData
        try {
            pixels = await assets.image(pathOf(key))
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            return null
        }
        const dataPath = dataPathOf(key)
        const data = shipped.includes(dataPath) ? await assets.json(dataPath) : null
        return { key, pixels, data }
    }))
    return loaded.filter(each => each !== null)
}
