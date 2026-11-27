import { describe, expect, test } from "vitest"
import { Gpu } from "@game/core-src/engine/gpu/Gpu"
import { Material } from "@game/core-src/engine/gpu/Material"
import { Painter } from "@game/core-src/engine/gpu/Painter"
import { ScreenSurface } from "@game/core-src/engine/gpu/ScreenSurface"
import { Shader } from "@game/core-src/engine/gpu/Shader"
import { Sprite } from "@game/core-src/engine/gpu/Sprite"
import { Texture } from "@game/core-src/engine/gpu/Texture"

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

describe("Material", () => {
    const WATER = "uniform float uTime;\nvec4 shade(vec2 uv, vec4 data){ return texture2D(uTexture, uv) * uTime; }"

    test("unknown uniform → throws, naming the known ones", () => {
        const { gpu } = setup()
        const lake = new Material(Shader.fragment(gpu, WATER))
        expect(() => lake.set("uTiem", 1)).toThrow(/uTime/)
    })

    test("value of another type → throws", () => {
        const { gpu } = setup()
        const lake = new Material(Shader.fragment(gpu, WATER))
        expect(() => lake.set("uTime", [1, 2])).toThrow(/float/)
    })

    test("set while the batch draws with it → the batch sent first", () => {
        const { fake, gpu, screen, atlas } = setup()
        const lake = new Material(Shader.fragment(gpu, WATER))
        const painter = new Painter(gpu, screen)
        painter.setMaterial(lake)
        painter.sprite(Sprite.whole(atlas), 0, 0)
        lake.set("uTime", 2)
        expect(fake.callsOf("drawElements").length).toBe(1)
    })

    test("set while the batch draws without it → nothing sent", () => {
        const { fake, gpu, screen, atlas } = setup()
        const lake = new Material(Shader.fragment(gpu, WATER))
        new Painter(gpu, screen).sprite(Sprite.whole(atlas), 0, 0)
        lake.set("uTime", 2)
        expect(fake.callsOf("drawElements").length).toBe(0)
    })
})
