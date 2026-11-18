import { describe, expect, test } from "vitest"
import { Assets, MemoryAssets } from "@game/core"
import { BACK_VISUAL, Visual } from "@game/core/mecard"
import { allPlaceTypes } from "@game/core/mecard"
import { dataPathOf, distinctPictures, loadPictures, pathOf, shippedPictures, shippedTransitions, transitionPath, transitionTintOf } from "@game/core/mecard/visual-path"
import { ASSET_PATHS } from "@game/core"

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

describe("transitions", () => {
    test("transitionPath → the painting of the key", () => {
        expect(transitionPath(new Visual({ visual: "door" }))).toBe("mecard/transitions/door.ora")
    })

    test("shippedTransitions → the keys of the paintings under transitions/", () => {
        const shipped = ["mecard/transitions/door.ora", "mecard/transitions/cave.ora", "mecard/border/x.png"] as never
        expect(shippedTransitions(shipped)).toEqual(["cave", "door"])
    })

    test("transitionTintOf → the coloration of the visual, none without", () => {
        expect(transitionTintOf(new Visual({ visual: "door" }))).toBeNull()
        const tint = transitionTintOf(new Visual({ visual: "door", coloration: [1, 0.5, 0.25] }))
        expect([tint?.r, tint?.g, tint?.b]).toEqual([1, 0.5, 0.25])
    })

    test("every place is entered by a transition the game ships", () => {
        for(const type of allPlaceTypes()){
            expect(ASSET_PATHS, type.id).toContain(transitionPath(type.transition))
        }
    })

    test("the way back to the map is a transition the game ships", () => {
        expect(ASSET_PATHS).toContain(transitionPath(BACK_VISUAL))
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

    test("a picture shipped with a JSON of its name → its data; without → none", async() => {
        const shipped = ["mecard/units/goblin.png", "mecard/units/goblin.json", "mecard/units/wall.png"] as never
        const files = new Assets(new MemoryAssets({
            "mecard/units/goblin.png": png({ width: 1, height: 1, colorType: RGB, samples: [1, 2, 3] }),
            "mecard/units/goblin.json": new TextEncoder().encode('{ "mode": "feet" }'),
            "mecard/units/wall.png": png({ width: 1, height: 1, colorType: RGB, samples: [1, 2, 3] }),
        }))
        const loaded = await loadPictures(files, ["units/goblin", "units/wall"], shipped)
        expect(loaded.map(each => each.data)).toEqual([{ mode: "feet" }, null])
    })

    test("a JSON that is not valid → an error naming the file, not a picture left out", async() => {
        const shipped = ["mecard/units/goblin.png", "mecard/units/goblin.json"] as never
        const files = new Assets(new MemoryAssets({
            "mecard/units/goblin.png": png({ width: 1, height: 1, colorType: RGB, samples: [1, 2, 3] }),
            "mecard/units/goblin.json": new TextEncoder().encode("{ not json"),
        }))
        await expect(loadPictures(files, ["units/goblin"], shipped)).rejects.toThrow(/goblin\.json/)
    })
})

describe("shippedPictures", () => {
    test("the pngs in a folder and under it → their keys, sorted; nothing from the other folders or the JSON files", () => {
        const shipped = [
            "mecard/units/wolf.png", "mecard/units/bear.png", "mecard/units/bear.json", "mecard/units/test/walls/x.png",
            "mecard/processes/haste.png",
        ] as never
        expect(shippedPictures("units", shipped)).toEqual(["units/bear", "units/test/walls/x", "units/wolf"])
    })

    test("a JSON shipped → beside a picture of its name", () => {
        const shipped: readonly string[] = ASSET_PATHS
        const orphans = shipped.filter(path => path.endsWith(".json") && !shipped.includes(path.replace(/\.json$/, ".png")))
        expect(orphans).toEqual([])
    })

    test("dataPathOf → the JSON of the key", () => {
        expect(dataPathOf("units/wolf")).toBe("mecard/units/wolf.json")
    })
})
