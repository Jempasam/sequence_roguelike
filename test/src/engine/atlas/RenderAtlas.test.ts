import { describe, expect, test } from "vitest"
import {
    Atlas, Camera, Gpu, ModelSurface, Painter, RenderAtlas, RenderTexture, ScreenSurface, Sprite,
    TextureSurface,
} from "@game/core"
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

// --- Tests ---

describe("RenderAtlas", () => {
    test("pages → render textures", () => {
        const { gpu } = setup()
        const atlas = new RenderAtlas(gpu, OPTIONS)
        atlas.add(image(4))
        expect(atlas.pages[0]).toBeInstanceOf(RenderTexture)
    })

    test("an animated water tile → copied into its slot in one call, the baked tilemap untouched", () => {
        const { fake, gpu } = setup()
        const frames = new Atlas(gpu, OPTIONS)
        const tiles = new RenderAtlas(gpu, OPTIONS)
        const wall = tiles.add(image(16))
        const water = tiles.reserve(16, 16)
        const waterFrames = frames.addAll([image(16), image(16)].map(pixels => ({ pixels })))

        const recording = new ModelSurface(gpu)
        const tilemap = new Painter(gpu, recording)
        tilemap.sprite(tiles.sprite(wall), 0, 0)
        tilemap.sprite(tiles.sprite(water), 16, 0)
        const model = recording.build()

        const page = tiles.rect(water).page
        const painter = new Painter(gpu, new TextureSurface(gpu, page, Camera.texelSpace(page)))
        painter.setBlend("copy")
        const slot = tiles.rect(water)
        painter.sprite(frames.sprite(waterFrames[1]), slot.x, slot.y)
        gpu.flush()
        expect(fake.callsOf("drawElements").length).toBe(1)

        new Painter(gpu, new ScreenSurface(gpu)).model(model)
        gpu.flush()
        expect(model.texture).toBe(page)
        expect(tiles.sprite(water)).toEqual(new Sprite(page, slot.x, slot.y, 16, 16))
    })
})

describe("RenderAtlas layout", () => {
    test("an Atlas and a RenderAtlas with the same operations → the same layout", () => {
        const { gpu } = setup()
        const frames = new Atlas(gpu, OPTIONS)
        const slots = new RenderAtlas(gpu, OPTIONS)
        frames.addAll([image(16), image(9, 3)].map(pixels => ({ pixels })))
        slots.addAll([{ reserve: [16, 16] }, { reserve: [9, 3] }])
        expect(slots.sameLayoutAs(frames)).toBe(true)
        expect(frames.sameLayoutAs(slots)).toBe(true)
    })

    test("a page growing → the same render texture, drawn into at its new size", () => {
        const { gpu } = setup()
        const atlas = new RenderAtlas(gpu, OPTIONS)
        atlas.add(image(30))
        const page = atlas.pages[0]
        atlas.add(image(30))
        expect(atlas.pages[0]).toBe(page)
        expect(page.width).toBeGreaterThan(32)
        expect(new TextureSurface(gpu, page).width).toBe(page.width)
    })

    test("two animated tiles of a page → updated in one call", () => {
        const { fake, gpu } = setup()
        const frames = new Atlas(gpu, OPTIONS)
        const tiles = new RenderAtlas(gpu, OPTIONS)
        const slots = tiles.addAll([{ reserve: [16, 16] }, { reserve: [16, 16] }])
        const current = frames.addAll([{ pixels: image(16) }, { pixels: image(16) }])
        fake.calls.length = 0
        const painter = new Painter(gpu, new TextureSurface(gpu, tiles.rect(slots[0]).page))
        painter.setBlend("copy")
        slots.forEach((slot, index) => {
            const { x, y } = tiles.rect(slot)
            painter.sprite(frames.sprite(current[index]), x, y)
        })
        gpu.flush()
        expect(fake.callsOf("drawElements").length).toBe(1)
    })
})
