import { describe, expect, test } from "vitest"
import { Gpu, ScreenSurface, Shader, Texture } from "@game/core"

import { fakeGfx, fakeGl } from "../../fixtures/fakeGl"
import type { FakeGl } from "../../fixtures/fakeGl"

// --- Fixture builders ---

function setup(): { fake: FakeGl, gpu: Gpu, screen: ScreenSurface, atlas: Texture, other: Texture } {
    const fake = fakeGl()
    const gpu = new Gpu(fakeGfx(fake.gl))
    const screen = new ScreenSurface(gpu)
    return { fake, gpu, screen, atlas: new Texture(gpu, 64, 64), other: new Texture(gpu, 64, 64) }
}

// --- Tests ---

describe("Shader", () => {
    test("a standard uniform redeclared → throws", () => {
        const { gpu } = setup()
        expect(() => Shader.fragment(gpu, "uniform vec4 uTint;\nvec4 shade(vec2 uv, vec4 data){ return uTint; }"))
            .toThrow(/uTint/)
    })

    test("uniforms read from the source", () => {
        const { gpu } = setup()
        const shader = Shader.fragment(gpu, `
            uniform vec4 uTop;
            uniform sampler2D uNoise;
            vec4 shade(vec2 uv, vec4 data){ return uTop * texture2D(uNoise, uv); }
        `)
        expect([...shader.uniforms.values()].map(({ name, type, unit }) => [name, type, unit]))
            .toEqual([["uTop", "vec4", 0], ["uNoise", "sampler2D", 1]])
    })
})
