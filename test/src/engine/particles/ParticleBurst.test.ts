import { describe, expect, test } from "vitest"
import {
    Gpu, motionAt, ParticleBurst, ParticleSpec, ParticleSystem, Painter, reachOf, ScreenSurface,
    seededRandom, Sprite, Texture,
} from "@game/core"
import type { Fill, Motion } from "@game/core"

import { fakeGfx, fakeGl } from "../../fixtures/fakeGl"

function setup(): { fake: ReturnType<typeof fakeGl>, gpu: Gpu, painter: Painter } {
    const fake = fakeGl()
    const gpu = new Gpu(fakeGfx(fake.gl))
    return { fake, gpu, painter: new Painter(gpu, new ScreenSurface(gpu)) }
}

/** The size of a vertex with four floats of `aData`: 20 bytes plus 16. */
const BURST_VERTEX_BYTES = 36

const shard: Fill = (spec, random) => {
    spec.vx = random() * 40 - 20
    spec.vy = -random() * 30
    spec.ay = 60
    spec.drag = 0.5
    spec.life = 0.4 + random() * 0.3
    spec.sizeStart = 4
    spec.sizeEnd = 1
    spec.colorStart.set(1, 0, 0, 1)
    spec.colorEnd.set(1, 0, 0, 0)
}

describe("motionAt", () => {
    test("no drag -> the plain v0 t + a t² / 2", () => {
        const out: Motion = { x: 0, y: 0, vx: 0, vy: 0 }
        motionAt(1, 2, 10, -4, 0, 20, 0, 0.5, out)
        expect(out.x).toBeCloseTo(1 + 5)
        expect(out.y).toBeCloseTo(2 - 2 + 0.5 * 20 * 0.25)
        expect(out.vx).toBeCloseTo(10)
        expect(out.vy).toBeCloseTo(-4 + 10)
    })

    test("a drag -> the speed tends to the rest speed a / k", () => {
        const out: Motion = { x: 0, y: 0, vx: 0, vy: 0 }
        motionAt(0, 0, 50, 0, 0, 30, 3, 10, out)
        expect(out.vx).toBeCloseTo(0, 3)
        expect(out.vy).toBeCloseTo(10, 3)
    })

    test("a tiny drag -> close to no drag, no blow up", () => {
        const out: Motion = { x: 0, y: 0, vx: 0, vy: 0 }
        const plain: Motion = { x: 0, y: 0, vx: 0, vy: 0 }
        motionAt(0, 0, 10, 10, 5, 5, 0.00001, 1, out)
        motionAt(0, 0, 10, 10, 5, 5, 0, 1, plain)
        expect(out.x).toBeCloseTo(plain.x)
        expect(out.vy).toBeCloseTo(plain.vy)
    })

    test("short steps of the system -> end where the closed form says", () => {
        const system = new ParticleSystem(2)
        const spec = new ParticleSpec()
        spec.vx = 30
        spec.vy = -20
        spec.ay = 60
        spec.drag = 1.5
        spec.life = 5
        system.emit(spec)
        for(let i = 0; i < 100; i++) system.update(0.005)
        const at = { x: 0, y: 0 }
        system.positionOf(0, at)
        const out: Motion = { x: 0, y: 0, vx: 0, vy: 0 }
        motionAt(0, 0, 30, -20, 0, 60, 1.5, 0.5, out)
        expect(at.x).toBeCloseTo(out.x, 0)
        expect(at.y).toBeCloseTo(out.y, 0)
    })
})

describe("reachOf", () => {
    test("any drag -> the bound is never exceeded", () => {
        const out: Motion = { x: 0, y: 0, vx: 0, vy: 0 }
        for(const drag of [0, 0.3, 2, 10]){
            const bound = reachOf(30, -20, 0, 60, 2)
            for(let t = 0; t <= 2; t += 0.1){
                motionAt(0, 0, 30, -20, 0, 60, drag, t, out)
                expect(Math.hypot(out.x, out.y)).toBeLessThanOrEqual(bound + 1e-9)
            }
        }
    })
})

describe("ParticleBurst.create", () => {
    test("a burst -> one model, drawn in a single call", () => {
        const { fake, gpu, painter } = setup()
        const burst = ParticleBurst.create(gpu, seededRandom(1), 10, 20, 12, shard)
        burst.update(0.1)
        burst.draw(painter, 5, 6)
        gpu.flush()
        expect(fake.callsOf("drawElements")).toHaveLength(1)
        expect(fake.callsOf("drawElements")[0].args[1]).toBe(12 * 6)
    })

    test("a count outside the limits -> refused", () => {
        const { gpu } = setup()
        expect(() => ParticleBurst.create(gpu, seededRandom(1), 0, 0, 0, shard)).toThrow()
        expect(() => ParticleBurst.create(gpu, seededRandom(1), 0, 0, 1e6, shard)).toThrow()
    })

    test("particles that differ by what is shared -> refused", () => {
        const { gpu } = setup()
        let n = 0
        const uneven: Fill = spec => {
            spec.drag = n++
        }
        expect(() => ParticleBurst.create(gpu, seededRandom(1), 0, 0, 3, uneven)).toThrow(/share/)
    })

    test("particles that differ by speed, life and color -> accepted", () => {
        const { gpu } = setup()
        const lively: Fill = (spec, random) => {
            spec.vx = random()
            spec.life = 1 + random()
            spec.colorStart.set(random(), random(), random(), 1)
        }
        expect(() => ParticleBurst.create(gpu, seededRandom(1), 0, 0, 5, lively)).not.toThrow()
    })

    test("the bounds -> hold every position a particle reaches", () => {
        const { gpu } = setup()
        const random = seededRandom(9)
        const burst = ParticleBurst.create(gpu, seededRandom(9), 100, 50, 30, shard)
        const out: Motion = { x: 0, y: 0, vx: 0, vy: 0 }
        const fillRandom = random
        for(let i = 0; i < 30; i++){
            const spec = new ParticleSpec()
            shard(spec, fillRandom, 100, 50)
            for(let t = 0; t < spec.life; t += 0.05){
                motionAt(100, 50, spec.vx, spec.vy, spec.ax, spec.ay, spec.drag, t, out)
                expect(out.x).toBeGreaterThanOrEqual(burst.bounds.left)
                expect(out.x).toBeLessThanOrEqual(burst.bounds.right)
                expect(out.y).toBeGreaterThanOrEqual(burst.bounds.top)
                expect(out.y).toBeLessThanOrEqual(burst.bounds.bottom)
            }
        }
    })

    test("a sprite shared -> its texels are the texture coordinates", () => {
        const { fake, gpu, painter } = setup()
        const sprite = new Sprite(new Texture(gpu, 32, 32), 8, 4, 6, 3)
        const fromSprite: Fill = spec => {
            spec.sprite = sprite
            spec.sizeStart = 6
            spec.sizeEnd = 6
            spec.life = 1
        }
        const burst = ParticleBurst.create(gpu, seededRandom(1), 0, 0, 1, fromSprite)
        burst.draw(painter)
        gpu.flush()
        const uploads = fake.callsOf("bufferData").filter(call => fake.nameOf(call.args[0]) === "ARRAY_BUFFER")
        const bytes = uploads[uploads.length - 1].args[1] as Uint8Array
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
        const texels = [0, 1, 2, 3].map(corner => [
            view.getUint16(corner * BURST_VERTEX_BYTES + 12, true),
            view.getUint16(corner * BURST_VERTEX_BYTES + 14, true),
        ])
        expect(texels).toEqual([[8, 4], [14, 4], [14, 7], [8, 7]])
    })
})

describe("life", () => {
    test("before the longest life -> not done, drawn", () => {
        const { fake, gpu, painter } = setup()
        const burst = ParticleBurst.create(gpu, seededRandom(2), 0, 0, 4, shard)
        burst.update(0.3)
        expect(burst.isDone).toBe(false)
        burst.draw(painter)
        gpu.flush()
        expect(fake.callsOf("drawElements")).toHaveLength(1)
    })

    test("past the longest life -> done, and no longer drawn", () => {
        const { fake, gpu, painter } = setup()
        const burst = ParticleBurst.create(gpu, seededRandom(2), 0, 0, 4, shard)
        burst.update(0.5)
        burst.update(0.5)
        expect(burst.isDone).toBe(true)
        burst.draw(painter)
        gpu.flush()
        expect(fake.callsOf("drawElements")).toHaveLength(0)
    })

    test("disposed -> flagged, twice is fine, and nothing is drawn", () => {
        const { fake, gpu, painter } = setup()
        const burst = ParticleBurst.create(gpu, seededRandom(2), 0, 0, 4, shard)
        burst.dispose()
        burst.dispose()
        expect(burst.disposed).toBe(true)
        burst.draw(painter)
        gpu.flush()
        expect(fake.callsOf("drawElements")).toHaveLength(0)
    })

    test("two bursts -> share one shader program", () => {
        const { fake, gpu } = setup()
        ParticleBurst.create(gpu, seededRandom(1), 0, 0, 2, shard)
        ParticleBurst.create(gpu, seededRandom(2), 0, 0, 2, shard)
        expect(fake.callsOf("linkProgram").length).toBeLessThanOrEqual(2)
    })
})
