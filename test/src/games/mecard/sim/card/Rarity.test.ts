import { describe, expect, test } from "vitest"
import { Rarity } from "@game/core/mecard"

// --- Tests ---

describe("Rarity.highest", () => {
    test("no rarity → common", () => {
        expect(Rarity.highest([])).toBe(Rarity.COMMON)
    })

    test("a common, an epic and a rare → epic", () => {
        expect(Rarity.highest([Rarity.COMMON, Rarity.EPIC, Rarity.RARE])).toBe(Rarity.EPIC)
    })
})

describe("Rarity.ALL", () => {
    test("the commonest first, each ranked by its place", () => {
        expect(Rarity.ALL.map(rarity => rarity.rank)).toEqual([0, 1, 2, 3])
    })
})
