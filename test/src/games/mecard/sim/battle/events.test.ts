import { describe, expect, test } from "vitest"
import { plainText } from "@game/core"
import { eventText } from "@game/core/mecard"

import { battle, unit } from "../fixtures"

// --- Tests ---

describe("eventText", () => {
    test("hurt → the unit, then the halves lost", () => {
        const on = battle()
        const hurt = unit(on, 1, 1)
        expect(plainText(eventText({ type: "hurt", unit: hurt, amount: 2 }) ?? "")).toBe("u0 perd 2 cœurs")
    })
})
