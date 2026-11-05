import { describe, expect, test } from "vitest"

import * as fixture from "./cWasm.fixture.c"

// --- Tests ---

describe("cWasm", () => {
    test("int function → called with numbers", () => {
        expect(fixture.sumOfSquares(3, 4)).toBe(25)
    })

    test("static function → not exported", () => {
        expect("square" in fixture).toBe(false)
    })

    test("libm → linked", () => {
        expect(fixture.hypotenuse(3, 4)).toBe(5)
    })

    test("long long → bigint", () => {
        expect(fixture.twice(2n ** 40n)).toBe(2n ** 41n)
    })

    test("variable → its address in the memory", () => {
        new Float32Array(fixture.memory.buffer, fixture.samples, 4).set([1, 2, 3, 4.5])
        expect(fixture.sumOfSamples()).toBe(10.5)
    })

    test("malloc → zeroed memory at the returned address", () => {
        const address = fixture.allocate(8)
        expect(address).toBeGreaterThan(0)
        expect([...new Float32Array(fixture.memory.buffer, address, 8)]).toEqual(new Array(8).fill(0))
    })
})
