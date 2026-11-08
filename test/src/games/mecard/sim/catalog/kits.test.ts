import { describe, expect, test } from "vitest"
import { closestKit, heroOf, ALL_KITS, kitScore, LANCER_KIT, MAGE_KIT, SWORDSMAN_KIT } from "@game/core/mecard"

// --- Tests ---

describe("heroOf", () => {
    test("a kit → copies of its items and usables, never the kit's own lists", () => {
        const kit = { ...LANCER_KIT, items: [], usables: [] }
        const first = heroOf(kit)
        const second = heroOf(kit)
        expect(first.items).not.toBe(kit.items)
        expect(first.items).not.toBe(second.items)
        expect(first.usables).not.toBe(second.usables)
    })
})

describe("kitScore", () => {
    test("the hero of the kit → 1; another kit → less", () => {
        const hero = heroOf(MAGE_KIT)
        expect(kitScore(hero, MAGE_KIT)).toBe(1)
        expect(kitScore(hero, SWORDSMAN_KIT)).toBeLessThan(1)
    })
})

describe("closestKit", () => {
    test("the hero of each kit → that kit", () => {
        for(const kit of ALL_KITS) expect(closestKit(heroOf(kit))).toBe(kit)
    })
})
