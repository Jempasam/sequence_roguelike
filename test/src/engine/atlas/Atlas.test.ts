import { describe, expect, test } from "vitest"
import { Atlas, Gpu, Painter, ScreenSurface } from "@game/core"
import type { AtlasOptions, PixelData } from "@game/core"

import { fakeGfx, fakeGl } from "../../fixtures/fakeGl"
import type { FakeGl } from "../../fixtures/fakeGl"

// --- Fixture builders ---

const OPTIONS: AtlasOptions = { maxSize: 256, padding: 1, initialSize: 32 }

function setup(): { fake: FakeGl, gpu: Gpu } {
    const fake = fakeGl()
    const gpu = new Gpu(fakeGfx(fake.gl))
    // Forgotten, so the white texture of the GPU is not counted among the writes of the atlas.
    fake.calls.length = 0
    return { fake, gpu }
}

/** An opaque image whose texel `(x, y)` has red `x` and green `y`. */
function image(width: number, height = width): PixelData {
    const data = new Uint8Array(width * height * 4)
    for(let y = 0; y < height; y++){
        for(let x = 0; x < width; x++) data.set([x, y, 0, 255], (y * width + x) * 4)
    }
    return { width, height, data }
}

/** The writes of texels, as `[x, y, width, height, data]`. */
function writesOf(fake: FakeGl): [number, number, number, number, Uint8Array][] {
    return fake.callsOf("texSubImage2D").map(call => {
        const [, , x, y, width, height, , , data] = call.args
        if(!(data instanceof Uint8Array)) throw new Error("A texture was written without texels.")
        return [Number(x), Number(y), Number(width), Number(height), data]
    })
}

/** The red and green of each texel of a write, row by row. */
function redGreenOf(data: Uint8Array, width: number, height: number): number[][][] {
    return Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => {
        const i = (y * width + x) * 4
        return [data[i], data[i + 1]]
    }))
}

// --- Tests ---

describe("Atlas.add", () => {
    test("an image → its sprite on a page, at its place, from its origin", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const goblin = atlas.add(image(16), { origin: [8, 16] })
        const sprite = atlas.sprite(goblin)
        expect(sprite.texture).toBe(atlas.pages[0])
        expect([sprite.x, sprite.y, sprite.width, sprite.height]).toEqual([0, 0, 16, 16])
        expect([sprite.originX, sprite.originY]).toEqual([8, 16])
    })

    test("on an open page → one write with its margin, transparent", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        atlas.add(image(8))
        const before = writesOf(fake).length
        atlas.add(image(4))
        const [x, y, width, height, data] = writesOf(fake)[before]
        expect([x, y, width, height]).toEqual([9, 0, 5, 5])
        expect(data[(4 * 5 + 4) * 4 + 3]).toBe(0)
        expect(data[(3 * 5 + 3) * 4 + 3]).toBe(255)
    })

    test("larger than maxSize → throws naming it", () => {
        const { gpu } = setup()
        expect(() => new Atlas(gpu, OPTIONS).add(image(300, 2))).toThrow(/300×2/)
    })

    test("maxSize above the GPU limit → cut down to it", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, { maxSize: 100000, initialSize: 4096 })
        atlas.add(image(4096, 1))
        expect(atlas.pages[0].width).toBe(gpu.limits.maxTextureSize)
    })
})

describe("Atlas.addAll", () => {
    test("entries → in the order of the items", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const entries = atlas.addAll([{ pixels: image(4) }, { pixels: image(16) }, { reserve: [8, 2] }])
        expect(entries.map(entry => [entry.width, entry.height])).toEqual([[4, 4], [16, 16], [8, 2]])
        expect(atlas.rect(entries[1])).toMatchObject({ x: 0, y: 0 })
    })

    test("a new page → composed on the CPU, one write", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        atlas.addAll(Array.from({ length: 20 }, () => ({ pixels: image(16) })))
        const writes = writesOf(fake)
        expect(writes.length).toBe(1)
        expect(writes[0].slice(0, 4)).toEqual([0, 0, atlas.pages[0].width, atlas.pages[0].height])
    })

    test("an open page growing several times → one resize", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        atlas.add(image(4))
        atlas.addAll(Array.from({ length: 30 }, () => ({ pixels: image(16) })))
        expect(atlas.pages[0].width).toBeGreaterThanOrEqual(128)
        expect(fake.callsOf("copyTexSubImage2D").length).toBe(1)
    })

    test("a reservation → placed as the image of its size, nothing written", () => {
        const { fake, gpu } = setup()
        const images = new Atlas(gpu, OPTIONS)
        const reserved = new Atlas(gpu, OPTIONS)
        images.addAll([{ pixels: image(12, 5) }, { pixels: image(7) }])
        const before = writesOf(fake).length
        reserved.addAll([{ reserve: [12, 5] }, { reserve: [7, 7] }])
        expect(reserved.sameLayoutAs(images)).toBe(true)
        expect(writesOf(fake).length).toBe(before)
    })
})

describe("Atlas size", () => {
    test("integer ratio → each pixel repeated", () => {
        const { fake, gpu } = setup()
        new Atlas(gpu, { ...OPTIONS, padding: 0 }).add(image(2), { size: [4, 4] })
        const [, , , , data] = writesOf(fake)[0]
        const page = redGreenOf(data, 32, 32)
        expect(page.slice(0, 4).map(row => row.slice(0, 4))).toEqual([
            [[0, 0], [0, 0], [1, 0], [1, 0]],
            [[0, 0], [0, 0], [1, 0], [1, 0]],
            [[0, 1], [0, 1], [1, 1], [1, 1]],
            [[0, 1], [0, 1], [1, 1], [1, 1]],
        ])
    })

    test("non integer ratio → nearest pixel, no new value", () => {
        const { fake, gpu } = setup()
        new Atlas(gpu, { ...OPTIONS, padding: 0 }).add(image(3, 1), { size: [2, 1] })
        const [, , , , data] = writesOf(fake)[0]
        expect(redGreenOf(data, 32, 32)[0].slice(0, 2)).toEqual([[0, 0], [1, 0]])
    })

    test("a region and its origin → in texels of the size placed", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        atlas.add(image(5))
        const sheet = atlas.add(image(16, 8), { size: [32, 16] })
        const frame = atlas.sprite(sheet, { x: 16, y: 0, width: 16, height: 16, origin: [8, 16] })
        const { x, y } = atlas.rect(sheet)
        expect([frame.x, frame.y, frame.width, frame.height]).toEqual([x + 16, y, 16, 16])
        expect([frame.originX, frame.originY]).toEqual([8, 16])
    })
})

describe("Atlas.sprite", () => {
    test("a region outside the entry → throws", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const entry = atlas.add(image(16))
        expect(() => atlas.sprite(entry, { x: 8, y: 0, width: 16, height: 16 })).toThrow(/inside an entry/)
    })

    test("a removed entry → throws", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const entry = atlas.add(image(16))
        atlas.add(image(4))
        atlas.remove(entry)
        expect(() => atlas.sprite(entry)).toThrow(/not in this atlas/)
    })

    test("an entry of another atlas → throws", () => {
        const { gpu } = setup()
        const entry = new Atlas(gpu, OPTIONS).add(image(4))
        expect(() => new Atlas(gpu, OPTIONS).sprite(entry)).toThrow(/not in this atlas/)
    })
})

describe("Atlas.remove", () => {
    test("the zone → taken by the next entry, written again with its margin", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const [first] = atlas.addAll([{ pixels: image(8) }, { pixels: image(8) }])
        atlas.remove(first)
        const next = atlas.add(image(8))
        expect(atlas.rect(next)).toMatchObject({ x: 0, y: 0 })
        expect(writesOf(fake).at(-1)?.slice(0, 4)).toEqual([0, 0, 9, 9])
    })

    test("the last entry of a page → its texture freed, out of the pages", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, { ...OPTIONS, maxSize: 32 })
        const [a, b] = atlas.addAll([{ pixels: image(32) }, { pixels: image(32) }])
        const [first, second] = atlas.pages
        const sprite = atlas.sprite(b)
        atlas.remove(a)
        expect(first.disposed).toBe(true)
        expect(atlas.pages).toEqual([second])
        expect(sprite.texture).toBe(second)
        expect(fake.callsOf("deleteTexture").length).toBe(1)
    })
})

describe("Atlas.sameLayoutAs", () => {
    test("colors and normals with the same operations → true, one more on one side → false", () => {
        const { gpu } = setup()
        const colors = new Atlas(gpu, OPTIONS)
        const normals = new Atlas(gpu, OPTIONS)
        const sources = [image(16), image(8, 24), image(12)]
        const colorEntries = colors.addAll(sources.map(pixels => ({ pixels })))
        const normalEntries = normals.addAll(sources.map((color, index) => index === 1
            ? { reserve: [color.width, color.height] as const }
            : { pixels: image(4), size: [color.width, color.height] as const }))
        expect(colors.sameLayoutAs(normals)).toBe(true)
        colors.remove(colorEntries[0])
        normals.remove(normalEntries[0])
        expect(colors.sameLayoutAs(normals)).toBe(true)
        colors.add(image(4))
        expect(colors.sameLayoutAs(normals)).toBe(false)
    })
})

describe("Atlas.dispose", () => {
    test("every page freed, adding afterwards throws", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, { ...OPTIONS, maxSize: 32 })
        atlas.addAll([{ pixels: image(32) }, { pixels: image(32) }])
        const pages = atlas.pages
        atlas.dispose()
        atlas.dispose()
        expect(pages.every(page => page.disposed)).toBe(true)
        expect(() => atlas.add(image(4))).toThrow(/disposed/)
    })
})

describe("Atlas options", () => {
    test("a negative padding → throws", () => {
        const { gpu } = setup()
        expect(() => new Atlas(gpu, { padding: -1 })).toThrow(/not possible/)
    })

    test("no options → pages open at 256, a padding of 1", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu)
        const [a, b] = atlas.addAll([{ pixels: image(8) }, { pixels: image(8) }])
        expect([atlas.pages[0].width, atlas.pages[0].height]).toEqual([256, 256])
        expect(atlas.rect(b).x - (atlas.rect(a).x + 8)).toBe(1)
    })
})

describe("Atlas batches", () => {
    test("a failing item → nothing placed, nothing written", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        expect(() => atlas.addAll([{ pixels: image(8) }, { pixels: image(400) }])).toThrow(/Item 1 of 2/)
        expect(atlas.pages.length).toBe(0)
        expect(writesOf(fake).length).toBe(0)
    })

    test("an open page and a new one in a batch → a write per image there, one write for the new", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, { ...OPTIONS, maxSize: 32 })
        atlas.add(image(8))
        const before = writesOf(fake).length
        const [small, large, other] = atlas.addAll([
            { pixels: image(4) }, { pixels: image(32) }, { pixels: image(4) },
        ])
        expect(atlas.pages.length).toBe(2)
        expect(atlas.rect(large).page).toBe(atlas.pages[1])
        expect([atlas.rect(small).page, atlas.rect(other).page]).toEqual([atlas.pages[0], atlas.pages[0]])
        expect(writesOf(fake).length - before).toBe(3)
    })

    test("an open page growing → resized before its images are written", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        atlas.add(image(30))
        fake.calls.length = 0
        atlas.add(image(30))
        const names = fake.calls.map(call => call.name)
        expect(names.indexOf("copyTexSubImage2D")).toBeGreaterThanOrEqual(0)
        expect(names.indexOf("copyTexSubImage2D")).toBeLessThan(names.lastIndexOf("texSubImage2D"))
    })

    test("sprites given before a growth → same texture, same texels", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const first = atlas.add(image(20))
        const before = atlas.sprite(first)
        atlas.addAll(Array.from({ length: 10 }, () => ({ pixels: image(20) })))
        expect(atlas.pages[0].width).toBeGreaterThan(32)
        expect(atlas.sprite(first)).toEqual(before)
        expect(before.texture).toBe(atlas.pages[0])
    })
})

describe("Atlas writes", () => {
    test("a sprite of the page submitted before a batch → drawn once, before the writes", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const entry = atlas.add(image(8))
        new Painter(gpu, new ScreenSurface(gpu)).sprite(atlas.sprite(entry), 0, 0)
        fake.calls.length = 0
        atlas.addAll([{ pixels: image(4) }, { pixels: image(4) }])
        const names = fake.calls.map(call => call.name)
        expect(names.filter(name => name === "drawElements").length).toBe(1)
        expect(names.indexOf("drawElements")).toBeLessThan(names.indexOf("texSubImage2D"))
    })

    test("an entry on the last column → its margin cut at the edge of the page", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, { maxSize: 32, padding: 2, initialSize: 32 })
        atlas.add(image(16))
        const entry = atlas.add(image(14))
        expect(atlas.rect(entry)).toMatchObject({ x: 18, y: 0 })
        expect(writesOf(fake).at(-1)?.slice(0, 4)).toEqual([18, 0, 14, 16])
    })

    test("no padding → the image written alone", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, { ...OPTIONS, padding: 0 })
        atlas.add(image(8))
        atlas.add(image(5, 3))
        expect(writesOf(fake).at(-1)?.slice(0, 4)).toEqual([8, 0, 5, 3])
    })

    test("only reservations on a new page → nothing written", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        atlas.reserve(16, 16)
        expect(atlas.pages.length).toBe(1)
        expect(writesOf(fake).length).toBe(0)
    })

    test("a freed zone reserved → its old texels left, nothing written", () => {
        const { fake, gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const [first] = atlas.addAll([{ pixels: image(8) }, { pixels: image(8) }])
        atlas.remove(first)
        const before = writesOf(fake).length
        const slot = atlas.reserve(8, 8)
        expect(atlas.rect(slot)).toMatchObject({ x: 0, y: 0 })
        expect(writesOf(fake).length).toBe(before)
    })
})

describe("Atlas entries", () => {
    test("a size → the entry, its sprite and its rectangle at that size", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const entry = atlas.add(image(4), { size: [12, 6], origin: [6, 6] })
        expect([entry.width, entry.height, entry.originX, entry.originY]).toEqual([12, 6, 6, 6])
        expect(atlas.rect(entry)).toMatchObject({ width: 12, height: 6 })
        expect(atlas.sprite(entry)).toMatchObject({ width: 12, height: 6, originX: 6, originY: 6 })
    })

    test("a non integer ratio upward → pixels repeated unevenly, no new value", () => {
        const { fake, gpu } = setup()
        new Atlas(gpu, { ...OPTIONS, padding: 0 }).add(image(2, 1), { size: [3, 1] })
        const [, , , , data] = writesOf(fake)[0]
        expect(redGreenOf(data, 32, 32)[0].slice(0, 3)).toEqual([[0, 0], [0, 0], [1, 0]])
    })

    test("a reservation with an origin → its sprite drawn from it", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const slot = atlas.reserve(16, 16, { origin: [8, 8] })
        expect(atlas.sprite(slot)).toMatchObject({ width: 16, height: 16, originX: 8, originY: 8 })
    })

    test("a region without origin → drawn from its top left corner", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const sheet = atlas.add(image(32, 16), { origin: [4, 4] })
        const frame = atlas.sprite(sheet, { x: 16, y: 0, width: 16, height: 16 })
        expect([frame.originX, frame.originY]).toEqual([0, 0])
    })

    test("a region up to the edges of the entry → accepted", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const entry = atlas.add(image(16))
        expect(atlas.sprite(entry, { x: 0, y: 0, width: 16, height: 16 })).toMatchObject({ width: 16 })
    })

    test("a region of fractions, no area or a negative edge → throws", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const entry = atlas.add(image(16))
        expect(() => atlas.sprite(entry, { x: 0.5, y: 0, width: 8, height: 8 })).toThrow(/whole texels/)
        expect(() => atlas.sprite(entry, { x: 0, y: 0, width: 0, height: 8 })).toThrow(/whole texels/)
        expect(() => atlas.sprite(entry, { x: -1, y: 0, width: 8, height: 8 })).toThrow(/whole texels/)
    })

    test("a removed entry → rect and remove throw", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const entry = atlas.add(image(16))
        atlas.add(image(4))
        atlas.remove(entry)
        expect(() => atlas.rect(entry)).toThrow(/not in this atlas/)
        expect(() => atlas.remove(entry)).toThrow(/not in this atlas/)
    })

    test("an entry of another atlas removed → throws, nothing changed", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        atlas.add(image(4))
        const foreign = new Atlas(gpu, OPTIONS).add(image(4))
        expect(() => atlas.remove(foreign)).toThrow(/not in this atlas/)
        expect(atlas.pages.length).toBe(1)
    })

    test("a disposed atlas → its entries give no sprite", () => {
        const { gpu } = setup()
        const atlas = new Atlas(gpu, OPTIONS)
        const entry = atlas.add(image(4))
        atlas.dispose()
        expect(() => atlas.sprite(entry)).toThrow(/not in this atlas/)
    })
})
