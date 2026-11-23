import { describe, expect, test } from "vitest"
import { Gpu, ParticleSpec, ParticleSystem, Painter, ScreenSurface, Sprite, Texture } from "@game/core"

import { fakeGfx, fakeGl, lastVertices } from "../../fixtures/fakeGl"

function make(maxParticles = 16): ParticleSystem {
    return new ParticleSystem(maxParticles)
}

function spec(configure: (spec: ParticleSpec) => void = () => {}): ParticleSpec {
    const result = new ParticleSpec()
    configure(result)
    return result
}

function drawSetup(): { fake: ReturnType<typeof fakeGl>, gpu: Gpu, painter: Painter } {
    const fake = fakeGl()
    const gpu = new Gpu(fakeGfx(fake.gl))
    return { fake, gpu, painter: new Painter(gpu, new ScreenSurface(gpu)) }
}

function positionAfter(system: ParticleSystem, index = 0): { x: number, y: number } {
    const out = { x: NaN, y: NaN }
    expect(system.positionOf(index, out)).toBe(true)
    return out
}

describe("update", () => {
    test("a particle older than its life -> removed", () => {
        const system = make()
        system.emit(spec(s => { s.life = 0.1 }))
        system.update(0.05)
        expect(system.count).toBe(1)
        system.update(0.05)
        expect(system.count).toBe(0)
    })

    test("a particle with a speed -> moves by speed times dt", () => {
        const system = make()
        system.emit(spec(s => { s.vx = 10; s.vy = -20 }))
        system.update(0.05)
        const at = positionAfter(system)
        expect(at.x).toBeCloseTo(0.5, 5)
        expect(at.y).toBeCloseTo(-1, 5)
    })

    test("a gravity -> the speed grows by acceleration times dt, then the position by the speed", () => {
        const system = make()
        system.emit(spec(s => { s.ay = 100; s.life = 5 }))
        system.update(0.05)
        expect(positionAfter(system).y).toBeCloseTo(0.25, 5)
        system.update(0.05)
        expect(positionAfter(system).y).toBeCloseTo(0.25 + 10 * 0.05, 5)
    })

    test("a drag -> the speed is multiplied by exp(-drag * dt) each step", () => {
        const system = make()
        system.emit(spec(s => { s.vx = 100; s.drag = 20; s.life = 5 }))
        let expected = 0
        let speed = 100
        for(let i = 0; i < 10; i++){
            system.update(0.05)
            speed *= Math.exp(-20 * 0.05)
            expected += speed * 0.05
        }
        expect(positionAfter(system).x).toBeCloseTo(expected, 3)
    })

    test("a long pause -> the step is cut to 50 ms", () => {
        const system = make()
        system.emit(spec(s => { s.vx = 100; s.life = 100 }))
        system.update(30)
        expect(positionAfter(system).x).toBeCloseTo(5, 5)
    })

    test("an index outside the living particles -> no position", () => {
        const system = make()
        system.emit(spec())
        expect(system.positionOf(1, { x: 0, y: 0 })).toBe(false)
        expect(system.positionOf(-1, { x: 0, y: 0 })).toBe(false)
    })

    test("no particle -> the bounds are empty", () => {
        const system = make()
        system.update(0.1)
        expect(system.bounds.left).toBeGreaterThan(system.bounds.right)
        system.emit(spec())
        system.update(0.01)
        expect(system.bounds.left).toBeLessThanOrEqual(system.bounds.right)
        system.clear()
        expect(system.count).toBe(0)
        expect(system.bounds.left).toBeGreaterThan(system.bounds.right)
    })

    test("a dead particle among living ones -> the others stay and keep their motion", () => {
        const system = make()
        system.emit(spec(s => { s.life = 0.01; s.x = -500 }))
        system.emit(spec(s => { s.life = 5; s.x = 100 }))
        system.emit(spec(s => { s.life = 5; s.x = 200 }))
        system.update(0.05)
        expect(system.count).toBe(2)
        expect(system.bounds.left).toBeGreaterThan(90)
        expect(system.bounds.right).toBeLessThan(210)
    })
})

describe("bounds", () => {
    test("a particle emitted before any update -> already inside the bounds", () => {
        const system = make()
        system.emit(spec(s => { s.x = 10; s.y = 20; s.sizeStart = 4; s.sizeEnd = 2 }))
        expect(system.bounds.left).toBeLessThanOrEqual(8)
        expect(system.bounds.right).toBeGreaterThanOrEqual(12)
        expect(system.bounds.top).toBeLessThanOrEqual(18)
        expect(system.bounds.bottom).toBeGreaterThanOrEqual(22)
    })

    test("a long sprite -> the bounds hold its half diagonal", () => {
        const { gpu } = drawSetup()
        const sprite = new Sprite(new Texture(gpu, 32, 32), 0, 0, 4, 16)
        const system = make()
        system.emit(spec(s => { s.sprite = sprite; s.sizeStart = 4; s.sizeEnd = 4; s.rotation = 1 }))
        const half = Math.hypot(2, 8)
        expect(system.bounds.right).toBeGreaterThanOrEqual(half - 1e-6)
        expect(system.bounds.bottom).toBeGreaterThanOrEqual(half - 1e-6)
    })

    test("the bounds -> cover every drawn vertex", () => {
        const { fake, gpu, painter } = drawSetup()
        const system = make()
        system.emit(spec(s => { s.x = 5; s.y = 5; s.sizeStart = 6; s.sizeEnd = 6; s.rotation = 0.7 }))
        system.draw(painter)
        gpu.flush()
        for(const vertex of lastVertices(fake)){
            expect(vertex.position[0]).toBeGreaterThanOrEqual(system.bounds.left - 1e-4)
            expect(vertex.position[0]).toBeLessThanOrEqual(system.bounds.right + 1e-4)
            expect(vertex.position[1]).toBeGreaterThanOrEqual(system.bounds.top - 1e-4)
            expect(vertex.position[1]).toBeLessThanOrEqual(system.bounds.bottom + 1e-4)
        }
    })
})

describe("white", () => {
    test("a white sprite given -> the squares are drawn from its texels", () => {
        const { fake, gpu, painter } = drawSetup()
        const atlas = new Texture(gpu, 16, 16)
        const system = new ParticleSystem(4, { white: new Sprite(atlas, 4, 6, 2, 2) })
        system.emit(spec())
        system.draw(painter)
        gpu.flush()
        expect(lastVertices(fake).every(vertex => vertex.uv[0] === 5 && vertex.uv[1] === 7)).toBe(true)
    })
})

describe("emit", () => {
    test("the system is full -> the new particle is dropped", () => {
        const system = make(2)
        for(let i = 0; i < 5; i++) system.emit(spec())
        expect(system.count).toBe(2)
    })

    test("the spec changes after emit -> the particle keeps the old values", () => {
        const system = make()
        const shared = spec(s => { s.x = 10; s.life = 5 })
        system.emit(shared)
        shared.x = 900
        system.update(0.01)
        expect(system.bounds.right).toBeLessThan(100)
    })

    test("no room for a particle -> the constructor refuses", () => {
        expect(() => new ParticleSystem(0)).toThrow()
    })
})

describe("draw", () => {
    test("no particle -> nothing is drawn", () => {
        const { fake, gpu, painter } = drawSetup()
        make().draw(painter)
        gpu.flush()
        expect(fake.callsOf("drawElements")).toHaveLength(0)
    })

    test("colored squares -> four vertices each, in one draw", () => {
        const { fake, gpu, painter } = drawSetup()
        const system = make()
        for(let i = 0; i < 3; i++) system.emit(spec(s => { s.x = i * 10; s.sizeStart = 4; s.sizeEnd = 4 }))
        system.draw(painter)
        gpu.flush()
        expect(fake.callsOf("drawElements")).toHaveLength(1)
        expect(lastVertices(fake)).toHaveLength(12)
    })

    test("a square -> centered on its position, offset by the draw", () => {
        const { fake, gpu, painter } = drawSetup()
        const system = make()
        system.emit(spec(s => { s.x = 10; s.y = 20; s.sizeStart = 4; s.sizeEnd = 4 }))
        system.draw(painter, 100, 200)
        gpu.flush()
        const xs = lastVertices(fake).map(vertex => vertex.position[0])
        const ys = lastVertices(fake).map(vertex => vertex.position[1])
        expect(Math.min(...xs)).toBeCloseTo(108)
        expect(Math.max(...xs)).toBeCloseTo(112)
        expect(Math.min(...ys)).toBeCloseTo(218)
        expect(Math.max(...ys)).toBeCloseTo(222)
    })

    test("a sprite -> drawn from its own texture, ratio kept", () => {
        const { fake, gpu, painter } = drawSetup()
        const sprite = new Sprite(new Texture(gpu, 32, 32), 0, 0, 8, 4)
        const system = make()
        system.emit(spec(s => { s.sprite = sprite; s.sizeStart = 8; s.sizeEnd = 8 }))
        system.draw(painter)
        gpu.flush()
        const vertices = lastVertices(fake)
        const xs = vertices.map(vertex => vertex.position[0])
        const ys = vertices.map(vertex => vertex.position[1])
        expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(8)
        expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(4)
    })

    test("the default blend of the painter -> particles still blend, so fading ones are not cut out", () => {
        const plain = drawSetup()
        plain.painter.rect(0, 0, 4, 4)
        plain.gpu.flush()
        const isBlending = (fake: ReturnType<typeof fakeGl>): boolean =>
            fake.callsOf("enable").some(call => fake.nameOf(call.args[0]) === "BLEND")
        expect(isBlending(plain.fake)).toBe(false)

        const { fake, gpu, painter } = drawSetup()
        const system = make()
        system.emit(spec(s => { s.colorEnd.set(1, 1, 1, 0) }))
        system.draw(painter)
        gpu.flush()
        expect(isBlending(fake)).toBe(true)
    })

    test("the blend asked -> restored for what the painter draws next", () => {
        const { fake, gpu, painter } = drawSetup()
        const system = new ParticleSystem(4, { blend: "additive" })
        system.emit(spec())
        system.draw(painter)
        painter.rect(0, 0, 4, 4)
        gpu.flush()
        expect(fake.callsOf("drawElements")).toHaveLength(2)
    })

    test("faceMotion -> the quad turns toward the speed", () => {
        const { fake, gpu, painter } = drawSetup()
        const system = make()
        system.emit(spec(s => {
            s.vy = 100
            s.faceMotion = true
            s.sizeStart = 4
            s.sizeEnd = 4
            s.life = 5
        }))
        system.draw(painter)
        gpu.flush()
        const vertices = lastVertices(fake)
        const dx = vertices[1].position[0] - vertices[0].position[0]
        const dy = vertices[1].position[1] - vertices[0].position[1]
        expect(Math.abs(dx)).toBeLessThan(1e-4)
        expect(Math.abs(dy)).toBeCloseTo(4)
    })

    test("more particles than a chunk holds -> several draws, none lost", () => {
        const { fake, gpu, painter } = drawSetup()
        const system = make(5000)
        for(let i = 0; i < 5000; i++) system.emit(spec())
        system.draw(painter)
        gpu.flush()
        const drawn = fake.callsOf("drawElements")
            .reduce((total, call) => total + (call.args[1] as number), 0)
        expect(drawn).toBe(5000 * 6)
    })
})
