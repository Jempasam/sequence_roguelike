import { describe, expect, test } from "vitest"
import {
    ACTION, DISTILLATION, FIRE, isFusion, LOOT_CARDS, lootUpgraded, POTION, readsWhole, REACTION, REPEAT_2, Rng,
    signatureOf, SLASH, SPELL, STEP, THROWN_POTION, THRUST, ALL_UPGRADES, upgrade, upgradeMatches, upgraded, WATER,
} from "@game/core/mecard"
import type { CardUpgrade } from "@game/core/mecard"

// --- Fixtures ---

const ECHO: CardUpgrade = upgrade("Écho", [REPEAT_2, undefined])
const LUNGE: CardUpgrade = upgrade("Fente", [undefined, THRUST], "merge")
const STEPPED: CardUpgrade = upgrade("Élan", [STEP, undefined], "random")
const SANDWICH: CardUpgrade = upgrade("Sandwich", [undefined, THRUST, undefined], "merge")
const TRIPLE: CardUpgrade = upgrade("Triplé", [undefined, undefined, undefined], "fusion", { output: ACTION })
const ANY_ELEMENT: CardUpgrade = upgrade("Élément", [SPELL, undefined, undefined], "fusion", signatureOf(FIRE))

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

    test("two holes → a copy of the card in each", () => {
        expect(upgraded(SANDWICH, SLASH, new Rng(1)).contents).toEqual([SLASH, THRUST, SLASH])
    })

    test("a manual filter → decides alone, whatever the chain reads", () => {
        expect(upgradeMatches(ANY_ELEMENT, FIRE)).toBe(true)
        expect(upgradeMatches(ANY_ELEMENT, SLASH)).toBe(false)
        expect(upgraded(ANY_ELEMENT, FIRE, new Rng(1)).contents).toEqual([SPELL, FIRE, FIRE])
    })

    test("no hole → a fixed chain; no card of its own → copies only", () => {
        const fixed = upgrade("Plein", [THRUST, SLASH], "fusion", {})
        expect(upgraded(fixed, FIRE, new Rng(1)).contents).toEqual([THRUST, SLASH])
        expect(upgraded(TRIPLE, SLASH, new Rng(1)).contents).toEqual([SLASH, SLASH, SLASH])
    })

    test("an empty filter → any card; a half filter → only what it says", () => {
        const any = upgrade("Tout", [REPEAT_2, undefined], "fusion", {})
        for(const card of [SLASH, FIRE, SPELL]) expect(upgradeMatches(any, card)).toBe(true)
        const potion = upgrade("Potion", [undefined, DISTILLATION], "fusion", { input: POTION })
        expect(upgradeMatches(potion, THROWN_POTION)).toBe(true)
        expect(upgradeMatches(potion, SLASH)).toBe(false)
    })

    test("a Réaction, an element, then an element card → one upgrade per element", () => {
        const reactives = ALL_UPGRADES.filter(upgrade => upgrade.chain[0] === REACTION)
        expect(reactives.length).toBe(6)
        expect(upgradeMatches(reactives[0], WATER)).toBe(true)
        expect(upgradeMatches(reactives[0], SLASH)).toBe(false)
        expect(upgraded(reactives[0], WATER, new Rng(1)).contents).toEqual([REACTION, FIRE, WATER])
    })

    test("the aim → merged, only with an action taking nothing", () => {
        const aim = ALL_UPGRADES.find(upgrade => upgrade.name === "Visée")!
        expect(upgradeMatches(aim, SLASH)).toBe(true)
        expect(upgradeMatches(aim, SPELL)).toBe(false)
    })

    test("a spell → followed by a Réaction and an element, one upgrade per element", () => {
        const reactions = ALL_UPGRADES.filter(upgrade => upgrade.chain[1] === REACTION)
        expect(reactions.length).toBe(6)
        for(const reaction of reactions){
            expect(upgradeMatches(reaction, SPELL)).toBe(true)
            expect(upgradeMatches(reaction, SLASH)).toBe(false)
        }
        expect(upgraded(reactions[0], SPELL, new Rng(1)).contents).toEqual([SPELL, REACTION, FIRE])
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
            // An upgrade with a filter ends on a card waiting for what the player puts after: whole only then.
            const waiting = ALL_UPGRADES.some(upgrade => upgrade.filter && upgrade.chain.some(held => held && card?.contents?.includes(held)))
            if(card?.contents && isFusion(card) && !waiting) expect(readsWhole(card.contents)).toBe(true)
        }
    })

    test("no upgrade → none", () => {
        expect(lootUpgraded(new Rng(1), [])).toBeNull()
    })
})

describe("ALL_UPGRADES", () => {
    test("each → named, and matching a card of the loot", () => {
        for(const upgrade of ALL_UPGRADES){
            expect(upgrade.name).not.toBe("")
            expect(LOOT_CARDS.some(card => upgradeMatches(upgrade, card)), upgrade.name).toBe(true)
        }
    })
})
