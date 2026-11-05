import { describe, expect, test } from "vitest"
import { Gpu, Painter, ScreenSurface, Sprite, Texture } from "@game/core"

import { fakeGfx, fakeGl } from "../../fixtures/fakeGl"
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

function drawCount(fake: FakeGl): number {
    return fake.callsOf("drawElements").length
}

// --- Tests ---

describe("Texture", () => {
    test("write → premultiplied texels", () => {
        const { fake, texture } = setup()
        texture.write(0, 0, { width: 1, height: 1, data: Uint8Array.of(255, 128, 0, 128) })
        const upload = fake.callsOf("texSubImage2D").at(-1)
        expect([...upload?.args[8] as Uint8Array]).toEqual([128, 64, 0, 128])
    })

    test("write outside → throws", () => {
        const { texture } = setup()
        expect(() => texture.write(60, 60, { width: 8, height: 8, data: new Uint8Array(256) })).toThrow()
    })

    test("resize → texels copied on the GPU", () => {
        const { fake, texture } = setup()
        texture.resize(128, 64)
        expect(fake.callsOf("copyTexSubImage2D")[0].args.slice(6)).toEqual([64, 64])
        expect(texture.width).toBe(128)
    })

    test("shrink → throws", () => {
        const { texture } = setup()
        expect(() => texture.resize(32, 64)).toThrow(/only grows/)
    })

    test("write with a pending draw of it → the draw sent first", () => {
        const { fake, painter, texture } = setup()
        painter.sprite(Sprite.whole(texture), 0, 0)
        texture.write(0, 0, { width: 1, height: 1, data: new Uint8Array(4) })
        expect(drawCount(fake)).toBe(1)
    })
})
