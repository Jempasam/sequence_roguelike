import { describe, expect, test } from "vitest"
import {
    baseOf, GOBLIN, heroOf, LANCER_KIT, LOOT_ITEMS, MAX_CHAIN_CARDS, orderedFactor, POWER, powerOf, scaledKit,
    statsOf, unorderedFactor,
} from "@game/core/mecard"

// --- Tests ---

describe("powerOf", () => {
    test.each([[1, 0], [2, 0], [3, 1], [4, 1], [5, 2], [9, 4]])("level %i → %i copies of the power", (level, copies) => {
        expect(powerOf(level)).toEqual(Array(copies).fill(POWER))
    })

    test("the power → never found as loot", () => {
        expect(LOOT_ITEMS).not.toContain(POWER)
    })

    test("copies of the power → every stat up but the moves", () => {
        const hero = heroOf(LANCER_KIT)
        const bare = statsOf(hero)
        hero.items.push(...powerOf(5))
        const stats = statsOf(hero)
        for(const name of ["strength", "precision", "heal", "summon", "alchemy"] as const){
            expect(stats[name].value).toBe(bare[name].value + 2)
        }
        expect(stats.meleeRange.value).toBeCloseTo(bare.meleeRange.value + 0.2)
        expect(stats.throwRange.value).toBeCloseTo(bare.throwRange.value + 0.2)
        expect(stats.move.value).toBe(bare.move.value)
    })
})

describe("orderedFactor", () => {
    test.each([[1, 1], [4, 1], [5, 2], [8, 2], [9, 4], [13, 8]])("level %i → times %i", (level, factor) => {
        expect(orderedFactor(level, 2)).toBe(factor)
    })

    test("a level so high its chain would overflow → doubled no further", () => {
        expect(orderedFactor(100, 3) * 3).toBeLessThanOrEqual(MAX_CHAIN_CARDS)
        expect(orderedFactor(100, 3)).toBe(16)
    })
})

describe("unorderedFactor", () => {
    test.each([[1, 1], [2, 1.25], [3, 1.5], [4, 1.75], [5, 2], [7, 3], [9, 4]])("level %i → times %f", (level, factor) => {
        expect(unorderedFactor(level, 4)).toBe(factor)
    })

    test("each step of the foes kept in order → the same factor", () => {
        for(const level of [1, 5, 9, 13]) expect(unorderedFactor(level, 2)).toBe(orderedFactor(level, 2))
    })

    test("a level so high its chain would overflow → held at the longest chain", () => {
        expect(unorderedFactor(100, 4) * 4).toBe(MAX_CHAIN_CARDS)
    })
})

describe("scaledKit", () => {
    test("level 1 → the same stats, cards and items", () => {
        const hero = heroOf(LANCER_KIT)
        const scaled = scaledKit(hero, 1)
        expect(scaled.decks).toEqual(hero.decks)
        expect(scaled.items).toEqual(hero.items)
        for(const name of ["draw", "firstDraw", "handSize", "chainSize"] as const){
            expect(baseOf(scaled, name)).toBe(baseOf(hero, name))
        }
    })

    test("level 4 → more cards drawn, held and played, whole copies of its deck, the character left as it was", () => {
        const hero = heroOf(LANCER_KIT)
        const cards = [...hero.decks[0]]
        const items = [...hero.items]
        const scaled = scaledKit(hero, 4)
        expect(["draw", "firstDraw", "chainSize", "handSize"].map(name => {
            return baseOf(scaled, name as "draw")
        })).toEqual([4, 9, 7, 14])
        expect(scaled.decks).toEqual([[...cards, ...cards]])
        expect(scaled.items).toEqual([...items, POWER])
        expect(hero.decks).toEqual([cards])
        expect(hero.items).toEqual(items)
        expect(baseOf(hero, "draw")).not.toBe(4)
    })

    test("a monster and a kit at the same step → both play twice as many cards", () => {
        const hero = heroOf(LANCER_KIT)
        expect(baseOf(scaledKit(hero, 5), "chainSize")).toBe(2 * baseOf(hero, "chainSize"))
        expect(orderedFactor(5, GOBLIN.draw)).toBe(2)
    })
})
