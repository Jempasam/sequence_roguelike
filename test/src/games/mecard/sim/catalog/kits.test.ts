import { describe, expect, test } from "vitest"
import {
    ALL_CARDS, ALL_ITEMS, ALL_USABLES, BLACK_HEART, BLACK_KNIGHT_KIT, BRAWLER_KIT, closestKit, heroOf, ALL_KITS,
    kitScore, LANCER_KIT, MAGE_KIT, PINK_HEART, RED_HEART, SWORDSMAN_KIT,
} from "@game/core/mecard"
import type { Kit } from "@game/core/mecard"

// --- Helpers ---

/** The hearts of a kit as `kind×count` texts, red first. */
function heartsOf(kit: Kit): string[] {
    return kit.hearts.map(group => `${group.kind.name}×${group.count}`)
}

// --- Tests ---

describe("ALL_KITS", () => {
    test("every kit → a distinct name", () => {
        const names = ALL_KITS.map(kit => kit.name)
        expect(new Set(names).size).toBe(names.length)
    })

    test("every kit → at most one usable and one item", () => {
        for(const kit of ALL_KITS){
            expect([kit.name, kit.usables.length <= 1, kit.items.length <= 1]).toEqual([kit.name, true, true])
        }
    })

    test("every kit → some hearts, the red ones first, and at most one other kind, a kept one", () => {
        const kept = [BLACK_HEART, PINK_HEART]
        for(const kit of ALL_KITS){
            const others = kit.hearts.filter(group => group.kind !== RED_HEART)
            const problems: string[] = []
            if(kit.hearts.reduce((sum, group) => sum + group.count, 0) < 1) problems.push("no heart")
            if(others.length > 1) problems.push("several other kinds")
            if(others.some(group => !kept.includes(group.kind))) problems.push("a kind that is not kept")
            if(kit.hearts.some((group, index) => group.kind === RED_HEART && index > 0)) problems.push("red not first")
            expect([kit.name, problems]).toEqual([kit.name, []])
        }
    })

    test("every card, item and usable of a kit → in the catalogs", () => {
        const cards = new Set(ALL_CARDS)
        const items = new Set(ALL_ITEMS)
        const usables = new Set(ALL_USABLES)
        const missing = ALL_KITS.flatMap(kit => [
            ...kit.cards.filter(each => !cards.has(each)).map(each => `${kit.name} : carte ${each.name}`),
            ...kit.items.filter(each => !items.has(each)).map(each => `${kit.name} : objet ${each.name}`),
            ...kit.usables.filter(each => !usables.has(each)).map(each => `${kit.name} : usable ${each.name}`),
        ])
        expect([...new Set(missing)]).toEqual([])
    })

    test("some kits → the hearts of the table", () => {
        expect(heartsOf(LANCER_KIT)).toEqual(["rouge×4"])
        expect(heartsOf(BRAWLER_KIT)).toEqual(["rouge×5", "rose×1"])
        expect(heartsOf(BLACK_KNIGHT_KIT)).toEqual(["noir×10"])
    })
})

describe("heroOf the hearts", () => {
    test("a kit → full hearts of the kinds of the kit, in order", () => {
        const hero = heroOf(SWORDSMAN_KIT)
        expect(hero.hearts.map(heart => heart.kind.name)).toEqual(["rouge", "rouge", "rouge", "rouge", "noir", "noir"])
        expect(hero.hearts.some(heart => heart.isEmpty)).toBe(false)
    })
})

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
