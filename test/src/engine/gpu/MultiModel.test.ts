import { describe, expect, test } from "vitest"
import {
    Color, Gpu, Mat4, Model, ModelSurface, MultiModel, Painter, ScreenSurface, Sprite, Texture,
} from "@game/core"

import { fakeGfx, fakeGl } from "../../fixtures/fakeGl"
import type { FakeGl } from "../../fixtures/fakeGl"

// --- Fixture builders ---

function setup(): { fake: FakeGl, gpu: Gpu, screen: ScreenSurface, atlas: Texture, other: Texture } {
    const fake = fakeGl()
    const gpu = new Gpu(fakeGfx(fake.gl))
    const screen = new ScreenSurface(gpu)
    return { fake, gpu, screen, atlas: new Texture(gpu, 64, 64), other: new Texture(gpu, 64, 64) }
}

/** A model of one sprite of a texture, baked at a place. */
function bakedTile(gpu: Gpu, texture: Texture, x = 0, y = 0): Model {
    const surface = new ModelSurface(gpu)
    new Painter(gpu, surface).sprite(new Sprite(texture, 0, 0, 16, 16), x, y)
    return surface.build()
}

// --- Tests ---

describe("MultiModel", () => {
    test("owning a model it does not place → throws", () => {
        const { gpu, atlas } = setup()
        expect(() => new MultiModel([], [bakedTile(gpu, atlas)])).toThrow(/does not place/)
    })

    test("replay of a disposed placed model → throws", () => {
        const { gpu, screen, atlas } = setup()
        const tile = bakedTile(gpu, atlas)
        const multi = new MultiModel([{ model: tile, transform: new Mat4(), tint: new Color() }])
        tile.dispose()
        expect(() => new Painter(gpu, screen).multiModel(multi)).toThrow(/disposed Model/)
    })

    test("replayed on the screen → one draw call per placement, the batch sent first", () => {
        const { fake, gpu, screen, atlas } = setup()
        const tile = bakedTile(gpu, atlas)
        const multi = new MultiModel([
            { model: tile, transform: new Mat4(), tint: new Color() },
            { model: tile, transform: new Mat4().translate(16, 0), tint: new Color(1, 0, 0) },
        ])
        const painter = new Painter(gpu, screen)
        painter.rect(0, 0, 4, 4)
        painter.multiModel(multi)
        expect(fake.callsOf("drawElements").length).toBe(3)
    })
})
