import { describe, expect, test } from "vitest"
import { spreadAcross } from "@game/core/mecard/spread"

describe("spreadAcross", () => {
    test("the outermost places → the edges of the map", () => {
        expect(spreadAcross(0.125, 0.125, 0.875)).toBe(0)
        expect(spreadAcross(0.875, 0.125, 0.875)).toBe(1)
    })

    test("the middle of the places → the middle of the map", () => {
        expect(spreadAcross(0.5, 0.125, 0.875)).toBeCloseTo(0.5)
    })

    test("a place between → its share of the way kept", () => {
        expect(spreadAcross(0.25, 0, 1)).toBe(0.25)
        expect(spreadAcross(0.25, 0.25, 0.75)).toBe(0)
        expect(spreadAcross(0.5, 0.25, 0.75)).toBeCloseTo(0.5)
    })

    test("all places across the same → the middle", () => {
        expect(spreadAcross(0.5, 0.5, 0.5)).toBe(0.5)
    })
})
