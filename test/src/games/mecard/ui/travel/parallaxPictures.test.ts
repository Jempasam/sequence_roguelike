import { strToU8, zipSync } from "fflate"
import { describe, expect, test } from "vitest"
import { ASSET_PATHS, AssetError, Assets, MemoryAssets } from "@game/core"
import type { AssetPath } from "@game/core"
import { ALL_FLOORS, allHalts } from "@game/core/mecard"
import { isSettingsLayer, layerName, loadParallaxPictures, parseLayerName, parseRangesName, rangesName } from "@game/core/mecard/parallax-pictures"
import { parallaxSource, pathOf, shippedParallaxes } from "@game/core/mecard/visual-path"

import { png, RGBA } from "../../../../fixtures/png"
import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** A pixel of a color, as a PNG. */
function pixel(red: number): Uint8Array {
    return png({ width: 1, height: 1, colorType: RGBA, samples: [red, 0, 0, 255] })
}

/** A painting of two layers, the top one moved off the canvas and half transparent, the other hidden or not. */
function painting(hiddenBottom = false): Uint8Array {
    const stack = `<image w="40" h="20"><stack>
        <layer src="data/top.png" name="2 [d=12,4 w=0.5 z=1]" x="-5" y="-3" opacity="0.5" />
        <layer src="data/bottom.png" name="1" x="0" y="0" visibility="${hiddenBottom ? "hidden" : "visible"}" />
    </stack></image>`
    return zipSync({
        mimetype: strToU8("image/openraster"),
        "stack.xml": strToU8(stack),
        "data/top.png": pixel(200),
        "data/bottom.png": pixel(100),
    })
}

function assets(files: Record<string, Uint8Array>): Assets {
    return new Assets(new MemoryAssets(files))
}

const SHIPPED = [
    "mecard/parallax/cave.ora",
    "mecard/parallax/cave/1.png",
    "mecard/parallax/wood/10.png",
    "mecard/parallax/wood/2.png",
    "mecard/parallax/wood/deep/1.png",
    "mecard/parallax/wood.png",
] as unknown as AssetPath[]

// --- Tests ---

describe("parallaxSource", () => {
    test("a painting shipped → it, before the pictures of the folder", () => {
        expect(parallaxSource("parallax/cave", SHIPPED)).toEqual({ painting: "mecard/parallax/cave.ora" })
    })

    test("no painting → the pictures right in the folder, by their number, the farthest first", () => {
        expect(parallaxSource("parallax/wood", SHIPPED)).toEqual({
            images: ["mecard/parallax/wood/2.png", "mecard/parallax/wood/10.png"],
        })
    })

    test("neither → an asset error naming the folder", () => {
        expect(() => parallaxSource("parallax/none", SHIPPED)).toThrow(AssetError)
    })
})

describe("shippedParallaxes", () => {
    test("each painting and folder of pictures, once", () => {
        expect(shippedParallaxes(SHIPPED)).toEqual(["parallax/cave", "parallax/wood"])
    })
})

describe("parseLayerName", () => {
    test("no brackets → the name alone, nothing set", () => {
        expect(parseLayerName("trees")).toEqual({ name: "trees", depth: null, warp: null, warnings: [] })
    })

    test("one value → both axes; two → one each; both settings, in any order", () => {
        expect(parseLayerName("fond [d=3]").depth).toEqual({ x: 3, y: 3 })
        expect(parseLayerName("fond [d=12,4]").depth).toEqual({ x: 12, y: 4 })
        const both = parseLayerName("arbres [w=0.5,-0.2 d=8]")
        expect(both).toEqual({ name: "arbres", depth: { x: 8, y: 8 }, warp: { x: 0.5, y: -0.2 }, warnings: [] })
    })

    test("a setting unreadable or unknown → left out, a warning saying what is expected", () => {
        const read = parseLayerName("arbres [d=a w=1,2,3 q=1 d=4]")
        expect(read.depth).toEqual({ x: 4, y: 4 })
        expect(read.warp).toBeNull()
        expect(read.warnings).toHaveLength(3)
        expect(read.warnings[0]).toContain("d=X ou d=X,Y")
    })
})

describe("layerName", () => {
    test("settings written back → read again the same", () => {
        const written = layerName("arbres", { x: 12, y: 4 }, { x: 0.5, y: 0.5 })
        expect(written).toBe("arbres [d=12,4 w=0.5]")
        expect(parseLayerName(written)).toMatchObject({ name: "arbres", depth: { x: 12, y: 4 }, warp: { x: 0.5, y: 0.5 } })
        expect(layerName("fond", null, null)).toBe("fond")
    })
})

describe("the layer of settings", () => {
    test("its name, whatever its brackets or case → known as it", () => {
        expect(isSettingsLayer("parallax [d=1:2]")).toBe(true)
        expect(isSettingsLayer("Parallax")).toBe(true)
        expect(isSettingsLayer("parallaxe")).toBe(false)
    })

    test("one range → both axes; two → X then Y; unreadable → left out, told", () => {
        expect(parseRangesName("parallax [d=20:85]").depth).toEqual({ x: { far: 20, near: 85 }, y: { far: 20, near: 85 } })
        const both = parseRangesName("parallax [d=20:85,20:40 w=0:0.5]")
        expect(both.depth).toEqual({ x: { far: 20, near: 85 }, y: { far: 20, near: 40 } })
        expect(both.warp).toEqual({ x: { far: 0, near: 0.5 }, y: { far: 0, near: 0.5 } })
        const bad = parseRangesName("parallax [d=20 w=1:2:3]")
        expect([bad.depth, bad.warp]).toEqual([null, null])
        expect(bad.warnings).toHaveLength(2)
    })

    test("ranges written → read again the same", () => {
        const depth = { x: { far: 20, near: 85 }, y: { far: 20, near: 40 } }
        const warp = { x: { far: 0, near: 0 }, y: { far: 0, near: 0 } }
        const written = rangesName(depth, warp)
        expect(written).toBe("parallax [d=20:85,20:40 w=0:0]")
        expect(parseRangesName(written)).toMatchObject({ depth, warp })
    })

    test("in a painting, hidden or not → its ranges read, never drawn", async() => {
        const stack = `<image w="40" h="20"><stack>
            <layer src="data/settings.png" name="parallax [d=3:9]" x="0" y="0" visibility="hidden" />
            <layer src="data/bottom.png" name="1" x="0" y="0" />
        </stack></image>`
        const ora = zipSync({
            mimetype: strToU8("image/openraster"),
            "stack.xml": strToU8(stack),
            "data/settings.png": pixel(0),
            "data/bottom.png": pixel(100),
        })
        const { layers, ranges } = await loadParallaxPictures(assets({ "mecard/p.ora": ora }), {
            painting: "mecard/p.ora" as never,
        })
        expect(layers.map(layer => layer.name)).toEqual(["1"])
        expect(ranges.depth).toEqual({ x: { far: 3, near: 9 }, y: { far: 3, near: 9 } })
        expect(ranges.warp).toBeNull()
    })

    test("no layer of settings, or pictures apart → no ranges", async() => {
        const { ranges } = await loadParallaxPictures(assets({ "mecard/p.ora": painting() }), {
            painting: "mecard/p.ora" as never,
        })
        expect(ranges).toEqual({ depth: null, warp: null })
    })
})

describe("loadParallaxPictures", () => {
    test("a painting with layer settings → read from the names, the names kept bare, the unknown told", async() => {
        const { layers, warnings } = await loadParallaxPictures(assets({ "mecard/p.ora": painting() }), {
            painting: "mecard/p.ora" as never,
        })
        expect(layers.map(layer => [layer.name, layer.depth, layer.warp])).toEqual([
            ["1", null, null],
            ["2", { x: 12, y: 4 }, { x: 0.5, y: 0.5 }],
        ])
        expect(warnings).toHaveLength(1)
        expect(warnings[0]).toContain("mecard/p.ora")
    })

    test("a painting → its visible layers, the bottom one first, placed as on its canvas, centred, its longest side 1", async() => {
        const { layers: loaded } = await loadParallaxPictures(assets({ "mecard/p.ora": painting() }), {
            painting: "mecard/p.ora" as never,
        })
        expect(loaded.map(layer => layer.pixels.data[0])).toEqual([100, 200])
        expect(loaded.map(layer => layer.place)).toEqual([
            { x: -0.5, y: -0.25, width: 0.025, height: 0.025 },
            { x: -0.625, y: -0.325, width: 0.025, height: 0.025 },
        ])
    })

    test("a layer half transparent → its alpha halved", async() => {
        const { layers: loaded } = await loadParallaxPictures(assets({ "mecard/p.ora": painting() }), {
            painting: "mecard/p.ora" as never,
        })
        expect(loaded[1].pixels.data[3]).toBe(128)
    })

    test("a hidden layer → left out", async() => {
        const { layers: loaded } = await loadParallaxPictures(assets({ "mecard/p.ora": painting(true) }), {
            painting: "mecard/p.ora" as never,
        })
        expect(loaded.map(layer => layer.pixels.data[0])).toEqual([200])
    })

    test("pictures apart → each fitted on its own, no place", async() => {
        const { layers: loaded } = await loadParallaxPictures(assets({ "mecard/a.png": pixel(1), "mecard/b.png": pixel(2) }), {
            images: ["mecard/a.png", "mecard/b.png"] as never,
        })
        expect(loaded.map(layer => layer.place)).toEqual([null, null])
        expect(loaded.map(layer => layer.pixels.data[0])).toEqual([1, 2])
    })
})

describe("the scenes of the game", () => {
    test("each parallax and each frame of the halts and the floors → shipped", () => {
        const run = startedRun(1)
        const looks = [...allHalts().map(type => type.create(run).look), ...ALL_FLOORS.map(type => type.look)]
        for(const look of looks){
            expect(() => parallaxSource(look.parallax), look.parallax.visual).not.toThrow()
            expect(ASSET_PATHS, look.border.visual).toContain(pathOf(look.border))
        }
    })
})
