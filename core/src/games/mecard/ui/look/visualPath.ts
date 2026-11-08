import { AssetError } from "../../../../engine/assets"
import type { Assets, ImagePath } from "../../../../engine/assets"
import type { PixelData } from "../../../../engine/image"
import type { Visual } from "../../sim/base/Visual"

/**
 * The file a visual names, if there is one: the one place where a key of the simulation becomes a path of
 * the assets. Nothing says the file exists, so what loads it must cope with its absence.
 */
export function pathOf(visual: Visual|string): ImagePath {
    const key = typeof visual === "string" ? visual : visual.visual
    return `mecard/${key}.png` as ImagePath
}

/** Each distinct picture of some visuals, once, by its key. */
export function distinctPictures(visuals: readonly Visual[]): Visual[] {
    return [...new Map(visuals.map(each => [each.visual, each])).values()]
}

/**
 * The pictures that keys name, as far as they exist: a key whose file cannot be read is left out, and the
 * screen draws what the visual says in its stead.
 */
export async function loadPictures(
    assets: Assets, keys: readonly string[],
): Promise<{ key: string, pixels: PixelData }[]> {
    const loaded = await Promise.all(keys.map(async key => {
        try {
            return { key, pixels: await assets.image(pathOf(key)) }
        } catch(error){
            if(!(error instanceof AssetError)) throw error
            return null
        }
    }))
    return loaded.filter(each => each !== null)
}
