import { describe, expect, test } from "vitest"
import { Assets, MemoryAssets } from "@game/core"
import { Visual } from "@game/core/mecard"
import { distinctPictures, loadPictures, pathOf } from "@game/core/mecard/visual-path"

import { png, RGB } from "../../../../fixtures/png"

// --- Fixture builders ---

function assets(): Assets {
    return new Assets(new MemoryAssets({
        "mecard/units/goblin.png": png({ width: 1, height: 1, colorType: RGB, samples: [1, 2, 3] }),
        "mecard/units/broken.png": Uint8Array.from([1, 2, 3]),
    }))
}

// --- Tests ---

describe("pathOf", () => {
    test("a key or a visual → the file under the assets of the game", () => {
        expect(pathOf("units/goblin")).toBe("mecard/units/goblin.png")
        expect(pathOf(new Visual({ visual: "statuses/burn" }))).toBe("mecard/statuses/burn.png")
    })
})

describe("distinctPictures", () => {
    test("visuals naming the same picture → one of them, the others kept apart", () => {
        const plain = new Visual({ visual: "units/fire" })
        const blue = plain.with({ coloration: [0, 0, 1] })
        const other = new Visual({ visual: "units/bomb" })
        expect(distinctPictures([plain, blue, other]).map(each => each.visual)).toEqual(["units/fire", "units/bomb"])
    })
})

describe("loadPictures", () => {
    test("keys with a file → their pixels, by key", async() => {
        const loaded = await loadPictures(assets(), ["units/goblin"])
        expect(loaded.map(each => each.key)).toEqual(["units/goblin"])
        expect(loaded[0].pixels.width).toBe(1)
    })

    test("a key with no file → left out, the others loaded", async() => {
        const loaded = await loadPictures(assets(), ["travel/fight/boss", "units/goblin"])
        expect(loaded.map(each => each.key)).toEqual(["units/goblin"])
    })

    test("a file that is not a valid image → left out too, as any file that cannot be read", async() => {
        const loaded = await loadPictures(assets(), ["units/broken"])
        expect(loaded).toEqual([])
    })

    test("no key → nothing", async() => {
        expect(await loadPictures(assets(), [])).toEqual([])
    })
})
