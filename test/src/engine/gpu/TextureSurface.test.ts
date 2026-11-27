import { describe, expect, test } from "vitest"
import { Gpu } from "@game/core-src/engine/gpu/Gpu"
import { Painter } from "@game/core-src/engine/gpu/Painter"
import { RenderTexture } from "@game/core-src/engine/gpu/RenderTexture"
import { ScreenSurface } from "@game/core-src/engine/gpu/ScreenSurface"
import { Sprite } from "@game/core-src/engine/gpu/Sprite"
import { Texture } from "@game/core-src/engine/gpu/Texture"
import { TextureSurface } from "@game/core-src/engine/gpu/TextureSurface"

import { fakeGfx, fakeGl, lastVertices } from "../../fixtures/fakeGl"
import type { FakeGl } from "../../fixtures/fakeGl"

// --- Fixture builders ---

function setup(options: { depthTexture?: boolean } = {}): {
    fake: FakeGl, gpu: Gpu, screen: ScreenSurface, painter: Painter, texture: Texture
} {
    const fake = fakeGl(options)
    const gpu = new Gpu(fakeGfx(fake.gl))
    const screen = new ScreenSurface(gpu)
    const texture = new Texture(gpu, 64, 64)
    return { fake, gpu, screen, painter: new Painter(gpu, screen), texture }
}

// --- Tests ---

describe("TextureSurface", () => {
    test("its own texture drawn into it → throws", () => {
        const { gpu, painter } = setup()
        const target = new RenderTexture(gpu, 32, 32)
        painter.setTarget(new TextureSurface(gpu, target))
        expect(() => painter.sprite(target.sprite, 0, 0)).toThrow(/feedback/)
    })

    test("readable depth without WEBGL_depth_texture → throws", () => {
        const { gpu } = setup({ depthTexture: false })
        expect(() => new RenderTexture(gpu, 8, 8, { depth: "texture" })).toThrow(/WEBGL_depth_texture/)
    })

    test("blit → the sprite over the whole view", () => {
        const { fake, gpu, painter, texture } = setup()
        painter.translate(50, 50)
        painter.blit(Sprite.whole(texture))
        gpu.flush()
        const corners = lastVertices(fake).map(vertex => vertex.position.slice(0, 2))
        expect(corners).toEqual([[0, 0], [320, 0], [320, 180], [0, 180]])
    })
})
