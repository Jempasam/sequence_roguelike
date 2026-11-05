import { describe, expect, test } from "vitest"
import {
    AIM, canUpgrade, DOUBLE_DIAGONAL, FIRE, FOCUS, LOOT_CARDS, readsWhole, REPEAT_2, Rng, SLASH, SPELL,
    upgradeOf,
} from "@game/core/mecard"

// --- Tests ---

describe("upgradeOf", () => {
    test("a blow → doubled or played to both diagonals, first", () => {
        const upgrade = upgradeOf(SLASH, new Rng(1))
        expect([REPEAT_2, DOUBLE_DIAGONAL]).toContain(upgrade?.[0])
        expect(upgrade?.[1]).toBe(SLASH)
    })

    test("an element → its spell first; a preparation card → twice", () => {
        expect(upgradeOf(FIRE, new Rng(1))).toEqual([SPELL, FIRE])
        expect(upgradeOf(FOCUS, new Rng(1))).toEqual([FOCUS, FOCUS])
    })

    test("an aim → none; every upgrade of the loot reads whole", () => {
        expect(canUpgrade(AIM)).toBe(false)
        expect(upgradeOf(AIM, new Rng(1))).toBeNull()
        for(const card of LOOT_CARDS){
            const upgrade = upgradeOf(card, new Rng(2))
            if(upgrade) expect(readsWhole(upgrade)).toBe(true)
        }
    })
})
