import { describe, expect, test } from "vitest"
import {
    Gpu, Model, ModelSurface, MultiModelSurface, Painter, ScreenSurface, Sprite, Texture,
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

describe("MultiModelSurface", () => {
    test("two textures in turn → two owned models", () => {
        const { gpu, atlas, other } = setup()
        const surface = new MultiModelSurface(gpu)
        const painter = new Painter(gpu, surface)
        painter.sprite(Sprite.whole(atlas), 0, 0)
        painter.sprite(Sprite.whole(atlas), 16, 0)
        painter.sprite(Sprite.whole(other), 0, 0)
        const multi = surface.build()
        expect(multi.placements.map(placement => placement.model.texture)).toEqual([atlas, other])
        multi.dispose()
        expect(multi.placements.every(placement => placement.model.disposed)).toBe(true)
    })

    test("two textures alternating → one model per texture, by first appearance", () => {
        const { gpu, atlas, other } = setup()
        const surface = new MultiModelSurface(gpu)
        const painter = new Painter(gpu, surface)
        for(let i = 0; i < 3; i++){
            painter.sprite(Sprite.whole(atlas), i * 16, 0)
            painter.sprite(Sprite.whole(other), i * 16, 16)
        }
        const multi = surface.build()
        expect(multi.placements.map(placement => placement.model.texture)).toEqual([atlas, other])
        expect(multi.placements.map(placement => placement.model.vertexCount)).toEqual([12, 12])
    })

    test("a model drawn into it → placed, not owned, not copied", () => {
        const { gpu, atlas } = setup()
        const room = bakedTile(gpu, atlas)
        const surface = new MultiModelSurface(gpu)
        const painter = new Painter(gpu, surface)
        for(let i = 0; i < 3; i++){
            painter.model(room)
            painter.translate(100, 0)
        }
        const multi = surface.build()
        expect(multi.placements.map(placement => placement.model)).toEqual([room, room, room])
        expect(multi.placements[2].transform.elements[12]).toBe(200)
        multi.dispose()
        expect(room.disposed).toBe(false)
    })
})
