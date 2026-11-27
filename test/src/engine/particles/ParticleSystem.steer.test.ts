import { describe, expect, test } from "vitest"
import { ParticleSpec } from "@game/core-src/engine/particles/ParticleSpec"
import { ParticleSystem } from "@game/core-src/engine/particles/ParticleSystem"

function lived(life: number): ParticleSpec {
    const spec = new ParticleSpec()
    spec.life = life
    return spec
}

describe("a steered particle", () => {

    test("emitted → it gets a handle, alive", () => {
        const system = new ParticleSystem(4)
        const handle = system.emit(lived(1))
        expect(handle).toBeGreaterThan(0)
        expect(system.isAlive(handle)).toBe(true)
    })

    test("steered toward a point within a time → it is there after that time", () => {
        const system = new ParticleSystem(4)
        const handle = system.emit(lived(5))
        expect(system.steer(handle, 20, -10, 0.04, 1)).toBe(true)
        system.update(0.04)
        const out = { x: 0, y: 0 }
        system.positionOf(0, out)
        expect(out.x).toBeCloseTo(20)
        expect(out.y).toBeCloseTo(-10)
    })

    test("another particle dies before it → it is still found by its handle", () => {
        const system = new ParticleSystem(4)
        system.emit(lived(0.01))
        const handle = system.emit(lived(5))
        system.update(0.02)
        expect(system.count).toBe(1)
        expect(system.steer(handle, 3, 0, 0.01, 1)).toBe(true)
    })

    test("dead → steering it tells so", () => {
        const system = new ParticleSystem(4)
        const handle = system.emit(lived(0.01))
        system.update(0.02)
        expect(system.isAlive(handle)).toBe(false)
        expect(system.steer(handle, 3, 0, 0.01, 1)).toBe(false)
    })

    test("the system is full → emit gives no handle, which steers nothing", () => {
        const system = new ParticleSystem(1)
        system.emit(lived(1))
        const handle = system.emit(lived(1))
        expect(handle).toBe(0)
        expect(system.steer(handle, 0, 0, 1, 1)).toBe(false)
    })
})
