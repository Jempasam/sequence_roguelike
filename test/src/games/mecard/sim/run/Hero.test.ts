import { describe, expect, test } from "vitest"
import {
    allyOf, AMULET, baseOf, GOBLIN, Heart, heroOf, LANCER_KIT, merged, SHIELD_HEART, statsOf,
    SWORDSMAN_KIT, WHETSTONE,
} from "@game/core/mecard"

// --- Tests ---

describe("allyOf", () => {
    test("a goblin → played by a bot, its hearts and its draw, its deck not kept in order", () => {
        const ally = allyOf(GOBLIN, "Gobelin allié")
        expect(ally.controller).toBe("bot")
        expect(ally.hearts).toHaveLength(GOBLIN.hearts)
        expect(baseOf(ally, "draw")).toBe(GOBLIN.draw)
        expect(baseOf(ally, "ordered")).toBe(false)
    })
})

describe("merged", () => {
    test("two heroes → hearts, cards and items together, draws and chains added, the rest the higher", () => {
        const lancer = heroOf(LANCER_KIT)
        const swordsman = heroOf(SWORDSMAN_KIT)
        swordsman.hearts.push(...Heart.many(SHIELD_HEART, 2))
        lancer.bases.handSize = 10
        const made = merged(lancer, swordsman)
        expect(made.name).toBe("Lancier-Épéiste")
        expect(made.controller).toBe("player")
        expect(made.decks).toEqual([lancer.decks[0], swordsman.decks[0]])
        expect(made.items).toEqual([WHETSTONE])
        expect(made.hearts.map(heart => heart.kind.name).at(-1)).toBe(SHIELD_HEART.name)
        expect(made.hearts).toHaveLength(lancer.hearts.length + swordsman.hearts.length)
        expect(baseOf(made, "draw")).toBe(2 * baseOf(lancer, "draw"))
        expect(baseOf(made, "chainSize")).toBe(2 * baseOf(lancer, "chainSize"))
        expect(baseOf(made, "handSize")).toBe(10)
    })

    test("two bots → a bot", () => {
        expect(merged(allyOf(GOBLIN, "a"), allyOf(GOBLIN, "b")).controller).toBe("bot")
    })

    test("a hero and a bot → played by the players", () => {
        expect(merged(allyOf(GOBLIN, "a"), heroOf(LANCER_KIT)).controller).toBe("player")
    })
})

describe("statsOf", () => {
    test("a hero with a whetstone and a vigor amulet → its damage up, its bases kept, its own hearts untouched", () => {
        const hero = heroOf(SWORDSMAN_KIT)
        hero.items.push(WHETSTONE, AMULET)
        const stats = statsOf(hero)
        expect(stats.strength.value).toBeGreaterThan(stats.strength.base)
        expect(stats.draw.value).toBe(baseOf(hero, "draw"))
        expect(hero.items).toEqual([WHETSTONE, AMULET])
    })
})
