import { describe, expect, test } from "vitest"
import {
    FIRE, isFusion, LOOT_CARDS, lootUpgraded, readsWhole, REPEAT_2, Rng, SLASH, SPELL, STEP, THRUST, UPGRADES,
    upgradeMatches, upgraded,
} from "@game/core/mecard"
import type { CardUpgrade } from "@game/core/mecard"

// --- Fixtures ---

const ECHO: CardUpgrade = { name: "Écho", card: REPEAT_2, placement: "front", fusion: "fusion" }
const LUNGE: CardUpgrade = { name: "Fente", card: THRUST, placement: "back", fusion: "merge" }
const STEPPED: CardUpgrade = { name: "Élan", card: STEP, placement: "front", fusion: "random" }

// --- Tests ---

describe("upgradeMatches", () => {
    test("a fusion → only a card reading whole with it, by its place", () => {
        expect(upgradeMatches(ECHO, SLASH)).toBe(true)
        expect(upgradeMatches(ECHO, FIRE)).toBe(false)
    })

    test("a merge → only a card giving actions on its own", () => {
        expect(upgradeMatches(LUNGE, SLASH)).toBe(true)
        expect(upgradeMatches(LUNGE, SPELL)).toBe(false)
    })
})

describe("upgraded", () => {
    test("in front → the upgrade first, fused", () => {
        const card = upgraded(ECHO, SLASH, new Rng(1))
        expect(isFusion(card) && card.contents).toEqual([REPEAT_2, SLASH])
    })

    test("behind → the card first", () => {
        const card = upgraded(LUNGE, SLASH, new Rng(1))
        expect(card.contents).toEqual([SLASH, THRUST])
        expect(isFusion(card)).toBe(false)
    })

    test("random → either way, whatever the seed", () => {
        const kinds = new Set<boolean>()
        for(let seed = 1; seed < 40; seed++) kinds.add(isFusion(upgraded(STEPPED, SLASH, new Rng(seed))))
        expect(kinds).toEqual(new Set([true, false]))
    })

    test("no match → an error", () => {
        expect(() => upgraded(ECHO, FIRE, new Rng(1))).toThrow()
    })
})

describe("lootUpgraded", () => {
    test("any seed → a card of the loot made one with an upgrade, reading whole", () => {
        for(let seed = 1; seed < 30; seed++){
            const card = lootUpgraded(new Rng(seed))
            expect(card).not.toBeNull()
            if(card?.contents && isFusion(card)) expect(readsWhole(card.contents)).toBe(true)
        }
    })

    test("no upgrade → none", () => {
        expect(lootUpgraded(new Rng(1), [])).toBeNull()
    })
})

describe("UPGRADES", () => {
    test("each → named, and matching a card of the loot", () => {
        for(const upgrade of UPGRADES){
            expect(upgrade.name).not.toBe("")
            expect(LOOT_CARDS.some(card => upgradeMatches(upgrade, card)), upgrade.name).toBe(true)
        }
    })
})
