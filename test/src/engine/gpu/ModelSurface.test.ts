import { describe, expect, test } from "vitest"
import { Gpu, Model, ModelSurface, Painter, Primitive, ScreenSurface, Sprite, Texture } from "@game/core"

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

/** The positions of the vertices of a model, `x, y` pairs. */
function positionsOf(model: Model): number[] {
    const floats = new Float32Array(model.vertices)
    const stride = model.vertices.byteLength / model.vertexCount / 4
    const out = []
    for(let i = 0; i < model.vertexCount; i++) out.push(floats[i * stride], floats[i * stride + 1])
    return out
}

// --- Tests ---

describe("ModelSurface", () => {
    test("several sprites of one texture → one model", () => {
        const { gpu, atlas } = setup()
        const surface = new ModelSurface(gpu)
        const painter = new Painter(gpu, surface)
        for(let i = 0; i < 10; i++) painter.sprite(new Sprite(atlas, 0, 0, 16, 16), i * 16, 0)
        const model = surface.build()
        expect(model.vertexCount).toBe(40)
        expect(model.indices.length).toBe(60)
        expect(model.texture).toBe(atlas)
    })

    test("another texture after the first draw → throws, nothing written", () => {
        const { gpu, atlas, other } = setup()
        const surface = new ModelSurface(gpu)
        const painter = new Painter(gpu, surface)
        painter.sprite(Sprite.whole(atlas), 0, 0)
        expect(() => painter.sprite(Sprite.whole(other), 0, 0)).toThrow(/another key/)
        expect(surface.build().vertexCount).toBe(4)
    })

    test("under a light → throws", () => {
        const { gpu, atlas } = setup()
        const painter = new Painter(gpu, new ModelSurface(gpu))
        painter.setLight(0.2, 0.2, 0.4)
        expect(() => painter.sprite(Sprite.whole(atlas), 0, 0)).toThrow(/only at replay/)
    })

    test("multiply blend → throws", () => {
        const { gpu, atlas } = setup()
        const painter = new Painter(gpu, new ModelSurface(gpu))
        painter.setBlend("multiply")
        expect(() => painter.sprite(Sprite.whole(atlas), 0, 0)).toThrow(/multiply/)
    })

    test("nothing drawn → build throws", () => {
        const { gpu } = setup()
        expect(() => new ModelSurface(gpu).build()).toThrow(/nothing drawn/)
    })

    test("a model drawn into it → its geometry copied, moved", () => {
        const { gpu, atlas } = setup()
        const tile = bakedTile(gpu, atlas)
        const surface = new ModelSurface(gpu)
        const painter = new Painter(gpu, surface)
        painter.model(tile)
        painter.translate(100, 0)
        painter.model(tile)
        const room = surface.build()
        expect(positionsOf(room)).toEqual([0, 0, 16, 0, 16, 16, 0, 16, 100, 0, 116, 0, 116, 16, 100, 16])
    })

    test("a hand-made strip absorbed → converted to a list", () => {
        const { gpu } = setup()
        const vertices = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1,
            1, 1, 0, 0, 0, 1, 1, 1, 1]
        const primitive = Primitive.TRIANGLE_STRIP
        const strip = Model.create(gpu, { primitive, vertices, indices: [0, 1, 2, 3] })
        expect(strip.primitive).toBe(Primitive.TRIANGLE_STRIP)
        const surface = new ModelSurface(gpu)
        new Painter(gpu, surface).model(strip)
        const flat = surface.build()
        expect(flat.primitive).toBe(Primitive.TRIANGLES)
        expect([...flat.indices]).toEqual([0, 1, 2, 2, 1, 3])
    })
})
