import { describe, expect, test } from "vitest"
import {
    burst, emitAlong, emitInside, emitOutline, ParticleSystem, Rate, seededRandom,
} from "@game/core"
import type { Fill } from "@game/core"

const keepPlace: Fill = spec => {
    spec.life = 100
}

describe("Rate", () => {
    test("a fractional rate -> the rest is kept between frames", () => {
        const rate = new Rate()
        let total = 0
        for(let i = 0; i < 60; i++) total += rate.take(20, 1 / 60)
        expect(total).toBe(20)
    })

    test("a rate under one per frame -> some frames emit nothing", () => {
        const rate = new Rate()
        expect(rate.take(20, 1 / 60)).toBe(0)
        expect(rate.take(20, 1 / 60)).toBe(0)
        expect(rate.take(20, 1 / 60)).toBe(1)
    })
})

describe("seededRandom", () => {
    test("the same seed -> the same numbers", () => {
        const a = seededRandom(7)
        const b = seededRandom(7)
        expect([a(), a(), a()]).toEqual([b(), b(), b()])
    })

    test("any seed -> numbers in [0, 1)", () => {
        const random = seededRandom(123)
        for(let i = 0; i < 1000; i++){
            const value = random()
            expect(value).toBeGreaterThanOrEqual(0)
            expect(value).toBeLessThan(1)
        }
    })
})

describe("burst", () => {
    test("a count -> that many particles at the point", () => {
        const system = new ParticleSystem(32)
        burst(system, seededRandom(1), 5, 6, 10, keepPlace)
        expect(system.count).toBe(10)
        system.update(0.001)
        expect(system.bounds.left).toBeLessThan(5)
        expect(system.bounds.right).toBeGreaterThan(5)
        expect(system.bounds.top).toBeLessThan(6)
        expect(system.bounds.bottom).toBeGreaterThan(6)
    })

    test("a fill -> receives a reset spec placed at the point", () => {
        const system = new ParticleSystem(4)
        const seen: number[][] = []
        burst(system, seededRandom(1), 3, 4, 1, (spec, _random, x, y) => {
            seen.push([spec.x, spec.y, x, y, spec.life, spec.vx])
        })
        expect(seen).toEqual([[3, 4, 3, 4, 1, 0]])
    })
})

describe("emitInside", () => {
    test("a rectangle -> every particle lands inside", () => {
        const system = new ParticleSystem(500)
        const rect = [10, 20, 30, 20, 30, 40, 10, 40]
        emitInside(system, seededRandom(2), rect, new Rate(), 6000, 0.05, keepPlace)
        expect(system.count).toBe(300)
        system.update(0.001)
        expect(system.bounds.left).toBeGreaterThan(8)
        expect(system.bounds.right).toBeLessThan(32)
        expect(system.bounds.top).toBeGreaterThan(18)
        expect(system.bounds.bottom).toBeLessThan(42)
    })

    test("a concave polygon -> no particle falls in the notch", () => {
        const system = new ParticleSystem(2000)
        const u = [0, 0, 30, 0, 30, 30, 20, 30, 20, 10, 10, 10, 10, 30, 0, 30]
        const inNotch: boolean[] = []
        emitInside(system, seededRandom(3), u, new Rate(), 40000, 0.05, (spec, _random, x, y) => {
            spec.life = 100
            inNotch.push(x > 10 && x < 20 && y > 10)
        })
        expect(inNotch.length).toBeGreaterThan(100)
        expect(inNotch.some(Boolean)).toBe(false)
    })

    test("fewer than three corners -> nothing", () => {
        const system = new ParticleSystem(10)
        emitInside(system, seededRandom(1), [0, 0, 5, 5], new Rate(), 1000, 1, keepPlace)
        expect(system.count).toBe(0)
    })
})

describe("emitAlong", () => {
    test("a horizontal line -> every particle on it", () => {
        const system = new ParticleSystem(200)
        const ys: number[] = []
        const xs: number[] = []
        emitAlong(system, seededRandom(4), [0, 5, 100, 5], new Rate(), 2000, 0.05, (spec, _random, x, y) => {
            spec.life = 100
            xs.push(x)
            ys.push(y)
        })
        expect(xs).toHaveLength(100)
        expect(ys.every(y => y === 5)).toBe(true)
        expect(xs.every(x => x >= 0 && x <= 100)).toBe(true)
    })

    test("a line of two segments -> both get particles", () => {
        const system = new ParticleSystem(400)
        const onFirst: number[] = []
        const onSecond: number[] = []
        const corner = [0, 0, 10, 0, 10, 10]
        emitAlong(system, seededRandom(5), corner, new Rate(), 8000, 0.05, (spec, _random, x, y) => {
            spec.life = 100
            if(y === 0) onFirst.push(x)
            else onSecond.push(y)
        })
        expect(onFirst.length).toBeGreaterThan(50)
        expect(onSecond.length).toBeGreaterThan(50)
    })

    test("a single point -> nothing", () => {
        const system = new ParticleSystem(10)
        emitAlong(system, seededRandom(1), [1, 1], new Rate(), 1000, 1, keepPlace)
        expect(system.count).toBe(0)
    })
})

describe("emitOutline", () => {
    test("a rectangle -> every particle on an edge, the closing one included", () => {
        const system = new ParticleSystem(1000)
        const seen: number[][] = []
        const rect = [0, 0, 20, 0, 20, 10, 0, 10]
        emitOutline(system, seededRandom(6), rect, new Rate(), 20000, 0.05, (spec, _random, x, y) => {
            spec.life = 100
            seen.push([x, y])
        })
        expect(seen).toHaveLength(1000)
        const onEdge = seen.every(([x, y]) => x === 0 || x === 20 || y === 0 || y === 10
            || Math.abs(x) < 1e-6 || Math.abs(x - 20) < 1e-6 || Math.abs(y) < 1e-6 || Math.abs(y - 10) < 1e-6)
        expect(onEdge).toBe(true)
        expect(seen.some(([x]) => Math.abs(x) < 1e-6)).toBe(true)
    })
})
