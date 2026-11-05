import { describe, expect, test } from "vitest"
import { spansOf } from "@game/core"

import { battle, rgbaOf, unit } from "../fixtures"

// --- Tests ---

describe("Unit.toString", () => {
    test("a unit → its name, for a sentence", () => {
        const on = battle()
        expect(`${unit(on, 1, 1)} tombe`).toBe("u0 tombe")
    })
})

describe("Unit.toSemString", () => {
    test("a unit → its name in the color its battle gave it, the next of its team another one", () => {
        const on = battle()
        const first = unit(on, 1, 1)
        const second = unit(on, 2, 1)
        expect(spansOf(first)).toEqual([{ kind: "string", text: "u0", color: rgbaOf(first), link: null }])
        expect(rgbaOf(second)).not.toEqual(rgbaOf(first))
    })
})
