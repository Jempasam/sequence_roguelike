import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"
import { ASSET_PATHS } from "@game/core-src/engine/assets/AssetPath"
import { Assets } from "@game/core-src/engine/assets/Assets"
import { MemoryAssets } from "@game/core-src/engine/assets/MemoryAssets"
import type { PixelData } from "@game/core-src/engine/image/PixelData"
import { loadParallaxPictures } from "@game/core/mecard/parallax-pictures"

const ROOT = join(__dirname, "../../../../../..")

/** Does a row or a column of the pixels of a layer hold any that is not transparent? */
function drawn(pixels: PixelData, side: "top"|"bottom"|"left"|"right"): boolean {
    const { width, height, data } = pixels
    const horizontal = side === "top" || side === "bottom"
    const fixed = side === "top" || side === "left" ? 0 : (horizontal ? height : width) - 1
    for(let along = 0; along < (horizontal ? width : height); along++){
        const x = horizontal ? along : fixed
        const y = horizontal ? fixed : along
        if(data[(y * width + x) * 4 + 3] > 0) return true
    }
    return false
}

describe("the paintings of the parallaxes the game ships", () => {
    const shipped = ASSET_PATHS.filter(path => path.startsWith("mecard/parallax/") && path.endsWith(".ora"))

    test("each layer → no drawn edge of it lies inside the viewport, so none shows at rest", async() => {
        expect(shipped.length).toBeGreaterThan(0)
        const edges: string[] = []
        for(const path of shipped){
            const file = ["assets", "generated_assets"].map(root => join(ROOT, root, path)).find(each => existsSync(each))
            const assets = new Assets(new MemoryAssets({ [path]: new Uint8Array(readFileSync(file as string)) }))
            const { layers, viewport } = await loadParallaxPictures(assets, { painting: path as never })
            for(const layer of layers){
                const { x, y, width, height } = layer.place!
                const inside = {
                    left: x > 0,
                    top: y > 0,
                    right: x + width < viewport!.width,
                    bottom: y + height < viewport!.height,
                }
                for(const side of ["left", "top", "right", "bottom"] as const){
                    if(inside[side] && drawn(layer.pixels, side)) edges.push(`${path} « ${layer.name} » : bord ${side}`)
                }
            }
        }
        expect(edges).toEqual([])
    })
})
