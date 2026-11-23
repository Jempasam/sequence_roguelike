import { describe, expect, test } from "vitest"
import { ALL_KITS, ALL_MONSTERS, allyOf, foeOf, heroOf } from "@game/core/mecard"
import type { Hero } from "@game/core/mecard"
import { unitDeckShown } from "@game/core/mecard/unit-view"

// --- Fixture builders ---

/** A hero holding exactly these cards in one deck, the bases of its stats given. */
function holding(cards: Hero["decks"][number], bases: Hero["bases"] = {}): Hero {
    return { ...heroOf(ALL_KITS[0]), decks: [cards], bases }
}

/** The first three distinct cards of a kit that has them. */
function threeCards(): Hero["decks"][number] {
    const kit = ALL_KITS.find(each => new Set(each.cards).size >= 3)!
    return [...new Set(kit.cards)].slice(0, 3)
}

// --- Tests ---

describe("unitDeckShown", () => {
    test("deck in order, as big as what it draws and as its chain → that chain, no count of cards", () => {
        const [a, b, c] = threeCards()
        const hero = holding([a, b, c, a], { ordered: true, draw: 4, firstDraw: 4, chainSize: 4 })
        const shown = unitDeckShown(hero)
        expect(shown.cards).toEqual([a, b, c, a])
        expect(shown.count).toBe(false)
    })

    test("deck bigger than its chain → one of each card, with the count of cards", () => {
        const [a, b, c] = threeCards()
        const hero = holding([a, b, c, a], { ordered: true, draw: 3, firstDraw: 3, chainSize: 3 })
        const shown = unitDeckShown(hero)
        expect(shown.cards).toEqual([a, b, c])
        expect(shown.count).toBe(true)
    })

    test("deck not kept in order, even as big as its chain → one of each card, with the count of cards", () => {
        const [a, b] = threeCards()
        const hero = holding([a, b, a], { ordered: false, draw: 3, firstDraw: 3, chainSize: 3 })
        const shown = unitDeckShown(hero)
        expect(shown.cards).toEqual([a, b])
        expect(shown.count).toBe(true)
    })

    test("deck of different cards, not a chain → each card once, no count of cards", () => {
        const cards = threeCards()
        const shown = unitDeckShown(holding(cards))
        expect(shown.cards).toEqual(cards)
        expect(shown.count).toBe(false)
    })

    test("no card → nothing to show, no count of cards", () => {
        const shown = unitDeckShown(holding([]))
        expect(shown.cards).toEqual([])
        expect(shown.count).toBe(false)
    })

    test("monster whose deck is one round of what it draws → always the same chain", () => {
        const monster = ALL_MONSTERS.find(each => each.cards.length === each.draw)!
        const shown = unitDeckShown(foeOf(monster, monster.name))
        expect(shown.cards).toEqual(monster.cards)
        expect(shown.count).toBe(false)
    })

    test("the same monster as an ally, its deck shuffled → one of each card", () => {
        const monster = ALL_MONSTERS.find(each => each.cards.length === each.draw)!
        const shown = unitDeckShown(allyOf(monster, monster.name))
        expect(shown.cards).toEqual([...new Set(monster.cards)])
    })
})
