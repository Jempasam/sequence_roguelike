import { describe, expect, test } from "vitest"
import { Vector2 } from "@game/core/mecard"

// --- Tests ---

describe("Vector2.toString", () => {
    test("a point → its coordinates rounded", () => {
        expect(`${new Vector2(1.5, -2 / 3)}`).toBe("(1.5, -0.67)")
    })
})
