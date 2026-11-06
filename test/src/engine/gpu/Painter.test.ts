import { describe, expect, test } from "vitest"
import {
    Color, Gpu, Material, Painter, Primitive, RenderTexture, ScreenSurface, Shader, Sprite, Texture,
    TextureSurface,
} from "@game/core"

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

function drawCount(fake: FakeGl): number {
    return fake.callsOf("drawElements").length
}

// --- Tests ---

describe("Painter batching", () => {
    test("100 sprites of one texture → one draw call", () => {
        const { fake, gpu, painter, texture } = setup()
        const sprite = new Sprite(texture, 0, 0, 16, 16)
        for(let i = 0; i < 100; i++) painter.sprite(sprite, i, i)
        gpu.flush()
        expect(drawCount(fake)).toBe(1)
    })

    test("two textures in turn → one draw call each", () => {
        const { fake, gpu, painter, texture } = setup()
        const other = new Texture(gpu, 8, 8)
        painter.sprite(Sprite.whole(texture), 0, 0)
        painter.sprite(Sprite.whole(other), 0, 0)
        gpu.flush()
        expect(drawCount(fake)).toBe(2)
    })

    test("alpha then additive → one draw call, they share the GL state", () => {
        const { fake, gpu, painter, texture } = setup()
        painter.setBlend("alpha")
        painter.sprite(Sprite.whole(texture), 0, 0)
        painter.setBlend("additive")
        painter.sprite(Sprite.whole(texture), 0, 0)
        gpu.flush()
        expect(drawCount(fake)).toBe(1)
    })

    test("light changed → the batch breaks", () => {
        const { fake, gpu, painter, texture } = setup()
        painter.sprite(Sprite.whole(texture), 0, 0)
        painter.setLight(0.5, 0.5, 0.5)
        painter.sprite(Sprite.whole(texture), 0, 0)
        gpu.flush()
        expect(drawCount(fake)).toBe(2)
    })

    test("camera moved between two draws → the batch breaks", () => {
        const { fake, gpu, painter, screen, texture } = setup()
        painter.sprite(Sprite.whole(texture), 0, 0)
        screen.camera.position.x += 10
        painter.sprite(Sprite.whole(texture), 0, 0)
        gpu.flush()
        expect(drawCount(fake)).toBe(2)
    })

    test("drawn into a texture, then that texture drawn → sent in that order", () => {
        const { fake, gpu, painter, screen } = setup()
        const target = new RenderTexture(gpu, 32, 32)
        painter.setTarget(new TextureSurface(gpu, target))
        painter.rect(0, 0, 4, 4)
        painter.setTarget(screen)
        painter.sprite(target.sprite, 0, 0)
        gpu.flush()
        const order = fake.calls.filter(call => call.name === "drawElements" || call.name === "bindFramebuffer")
            .map(call => call.name === "drawElements" ? "draw" : call.args[1] === null ? "screen" : "texture")
        expect(order.slice(-4)).toEqual(["texture", "draw", "screen", "draw"])
    })
})

describe("Painter vertices", () => {
    test("transform → applied on the CPU", () => {
        const { fake, gpu, painter, texture } = setup()
        painter.translate(10, 20)
        painter.sprite(new Sprite(texture, 4, 8, 16, 16, 2, 3), 1, 2)
        gpu.flush()
        const [first, , third] = lastVertices(fake)
        expect(first.position).toEqual([9, 19, 0])
        expect(first.uv).toEqual([4, 8])
        expect(third.position).toEqual([25, 35, 0])
        expect(third.uv).toEqual([20, 24])
    })

    test("half transparent red tint → premultiplied color", () => {
        const { fake, gpu, painter, texture } = setup()
        painter.setTint(new Color(1, 0, 0, 0.5))
        painter.setBlend("alpha")
        painter.sprite(Sprite.whole(texture), 0, 0)
        gpu.flush()
        expect(lastVertices(fake)[0].color).toEqual([128, 0, 0, 128])
    })

    test("additive → alpha written as 0", () => {
        const { fake, gpu, painter, texture } = setup()
        painter.setBlend("additive")
        painter.sprite(Sprite.whole(texture), 0, 0)
        gpu.flush()
        expect(lastVertices(fake)[0].color).toEqual([255, 255, 255, 0])
    })

    test("triangle strip → converted to a list", () => {
        const { fake, gpu, painter, texture } = setup()
        const vertices = [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1, 1, 1,
            1, 1, 0, 0, 0, 1, 1, 1, 1]
        painter.draw(vertices, [0, 1, 2, 3], texture, Primitive.TRIANGLE_STRIP)
        gpu.flush()
        const indices = fake.callsOf("bufferSubData")
            .filter(call => fake.nameOf(call.args[0]) === "ELEMENT_ARRAY_BUFFER")
        expect([...indices[indices.length - 1].args[2] as Uint16Array]).toEqual([0, 1, 2, 2, 1, 3])
    })

    test("index outside the vertices → throws", () => {
        const { painter, texture } = setup()
        const vertex = [0, 0, 0, 0, 0, 1, 1, 1, 1]
        expect(() => painter.draw(vertex, [0, 0, 1], texture, Primitive.TRIANGLES)).toThrow(/outside/)
    })
})

describe("Painter state", () => {
    test("modulate, colorize, hue, mask → uColorMode 0, 1, 2, 3", () => {
        const { fake, gpu, painter, texture } = setup()
        for(const mode of ["modulate", "colorize", "hue", "mask"] as const){
            painter.setColorMode(mode)
            painter.sprite(Sprite.whole(texture), 0, 0)
            gpu.flush()
        }
        const values = fake.callsOf("uniform1f")
            .filter(call => (call.args[0] as { uniform: string } | null)?.uniform === "uColorMode")
            .map(call => call.args[1])
        expect(values).toEqual([0, 1, 2, 3])
    })

    test("push without pop → flush throws", () => {
        const { gpu, painter } = setup()
        painter.push()
        expect(() => gpu.flush()).toThrow(/pushed 1 more/)
    })

    test("pop without push → throws", () => {
        const { painter } = setup()
        expect(() => painter.pop()).toThrow()
    })

    test("pop → the state before push", () => {
        const { fake, gpu, painter, texture } = setup()
        painter.push()
        painter.translate(100, 100)
        painter.pop()
        painter.sprite(Sprite.whole(texture), 0, 0)
        gpu.flush()
        expect(lastVertices(fake)[0].position).toEqual([0, 0, 0])
    })

    test("clip under a turn → throws", () => {
        const { painter } = setup()
        painter.rotate(0.3)
        expect(() => painter.clip(0, 0, 10, 10)).toThrow(/turns/)
    })

    test("clip → scissor in pixels from the bottom", () => {
        const { fake, gpu, painter, texture } = setup()
        painter.clip(10, 20, 30, 40)
        painter.sprite(Sprite.whole(texture), 0, 0)
        gpu.flush()
        expect(fake.callsOf("scissor")[0].args).toEqual([10, 180 - 20 - 40, 30, 40])
    })

    test("data under a shader reading none → throws", () => {
        const { painter, texture } = setup()
        painter.setData(0.5)
        expect(() => painter.sprite(Sprite.whole(texture), 0, 0)).toThrow(/no aData/)
    })

    test("data beyond 1 under a bytes shader → throws", () => {
        const { gpu, painter, texture } = setup()
        const shade = "vec4 shade(vec2 uv, vec4 data){ return data; }"
        painter.setMaterial(new Material(Shader.fragment(gpu, shade, "bytes")))
        painter.setData(2)
        expect(() => painter.sprite(Sprite.whole(texture), 0, 0)).toThrow(/0 to 1/)
    })
})
