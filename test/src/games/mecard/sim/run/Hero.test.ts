import { describe, expect, test } from "vitest"
import {
    allyOf, AMULET, baseOf, foeOf, GOBLIN, GREEN_HEART, Heart, heroOf, LANCER_KIT, merged, monsterHearts,
    POWER, RED_HEART, SHIELD_GUARD, SHIELD_HEART, statsOf, SWORDSMAN_KIT, WHETSTONE,
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

describe("foeOf", () => {
    test("a goblin at level 3 → two more hearts, its deck kept in order", () => {
        const foe = foeOf(GOBLIN, "Gobelin", 3)
        expect(foe.controller).toBe("bot")
        expect(foe.hearts).toHaveLength(GOBLIN.hearts + 2)
        expect(baseOf(foe, "draw")).toBe(GOBLIN.draw)
        expect(baseOf(foe, "ordered")).toBe(true)
    })

    test("a goblin at level 5 → twice its draw and chain, its loop twice in its deck, two copies of the power", () => {
        const foe = foeOf(GOBLIN, "Gobelin", 5)
        expect(baseOf(foe, "draw")).toBe(2 * GOBLIN.draw)
        expect(baseOf(foe, "firstDraw")).toBe(2 * GOBLIN.draw)
        expect(baseOf(foe, "chainSize")).toBe(2 * GOBLIN.draw)
        expect(baseOf(foe, "handSize")).toBe(16)
        expect(foe.decks).toEqual([[...GOBLIN.cards, ...GOBLIN.cards]])
        expect(foe.items).toEqual([...GOBLIN.items ?? [], POWER, POWER])
    })

    test("a goblin at level 1 → its own loop and items", () => {
        const foe = foeOf(GOBLIN, "Gobelin")
        expect(foe.decks).toEqual([GOBLIN.cards])
        expect(foe.items).toEqual([...GOBLIN.items ?? []])
        expect(baseOf(foe, "handSize")).toBe(8)
    })
})

describe("monsterHearts", () => {
    /** The hearts as green and red counts, in order: "4V 2R". */
    const shape = (life: number) => {
        const hearts = monsterHearts(life)
        const greens = hearts.filter(heart => heart.kind === GREEN_HEART).length
        const reds = hearts.filter(heart => heart.kind === RED_HEART).length
        expect(hearts.slice(0, greens).every(heart => heart.kind === GREEN_HEART)).toBe(true)
        expect(greens * 2 + reds).toBe(life)
        return `${greens}V ${reds}R`
    }

    test.each([
        [4, "0V 4R"], [6, "0V 6R"], [7, "1V 5R"], [10, "4V 2R"], [12, "6V 0R"],
        [13, "6V 1R"], [14, "7V 0R"], [15, "7V 1R"], [24, "12V 0R"],
    ])("%i life → %s, the greens first, as much life as asked", (life, expected) => {
        expect(shape(life)).toBe(expected)
    })

    test("a monster of 10 hearts at level 1 → 4 green and 2 red hearts as a foe", () => {
        expect(foeOf(SHIELD_GUARD, "Garde").hearts.map(heart => heart.kind)).toEqual(
            [...Array(4).fill(GREEN_HEART), ...Array(2).fill(RED_HEART)])
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
