import { describe, expect, test } from "vitest"
import { AssetError, Assets, MemoryAssets } from "@game/core"
import type { AssetPath, ImagePath } from "@game/core"

import { GREY, png, RGB } from "../../fixtures/png"

// --- Fixture builders ---

// The paths are cast, since AssetPath only names the files under assets/, and the tests do not ship theirs.
const GOBLIN = "monsters/goblin.png" as ImagePath
const DEEP = "monsters/deep.png" as ImagePath
const BROKEN = "monsters/broken.png" as ImagePath
const MISSING = "monsters/missing.png" as ImagePath
const HIT = "sounds/hit.wav" as AssetPath

function assets(): Assets {
    return new Assets(new MemoryAssets({
        [GOBLIN]: png({ width: 1, height: 1, colorType: RGB, samples: [1, 2, 3] }),
        [DEEP]: png({ width: 1, height: 1, colorType: GREY, depth: 16, samples: [1] }),
        [BROKEN]: Uint8Array.from([1, 2, 3]),
        [HIT]: Uint8Array.from([4, 5, 6]),
    }))
}

async function errorOf(load: Promise<unknown>): Promise<AssetError> {
    const error = await load.then(() => null, (e: unknown) => e)
    if(error instanceof AssetError) return error
    throw new Error(`No AssetError was thrown, but ${String(error)}.`)
}

// --- Tests ---

describe("Assets.image", () => {
    test("PNG → its pixels", async() => {
        const image = await assets().image(GOBLIN)
        expect(image).toEqual({ width: 1, height: 1, data: Uint8Array.from([1, 2, 3, 255]) })
    })

    test("missing file → unreadable, naming it", async() => {
        const error = await errorOf(assets().image(MISSING))
        expect(error).toMatchObject({ path: MISSING, reason: "unreadable" })
        expect(error.message).toContain(MISSING)
    })

    test("not a PNG → invalid, naming it", async() => {
        const error = await errorOf(assets().image(BROKEN))
        expect(error).toMatchObject({ path: BROKEN, reason: "invalid" })
        expect(error.message).toContain(BROKEN)
    })

    test("16-bit PNG → unsupported", async() => {
        expect(await errorOf(assets().image(DEEP))).toMatchObject({ path: DEEP, reason: "unsupported" })
    })

    test("several in parallel → each its own image", async() => {
        const loader = assets()
        const [first, second] = await Promise.all([loader.image(GOBLIN), loader.image(GOBLIN)])
        expect(first).toEqual(second)
        expect(first.data).not.toBe(second.data)
    })
})

describe("Assets.bytes", () => {
    test("file → its bytes", async() => {
        expect(await assets().bytes(HIT)).toEqual(Uint8Array.from([4, 5, 6]))
    })

    test("missing file → unreadable", async() => {
        expect(await errorOf(assets().bytes(MISSING))).toMatchObject({ path: MISSING, reason: "unreadable" })
    })
})
