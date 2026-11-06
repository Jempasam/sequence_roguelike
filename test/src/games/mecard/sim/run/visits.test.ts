import { describe, expect, test } from "vitest"
import {
    AIM, cutFusions, FIRE, forge, FusionCard, heroOf, LANCER_KIT, possess, readsWhole, removeCards,
    REPEAT_2, Rng, sacrifice, SPELL, splitDeck, STEP, swapCards, THRUST, transmute,
} from "@game/core/mecard"
import type { Card, Hero } from "@game/core/mecard"

// --- Fixture builders ---

/** A hero holding exactly some cards. */
function holding(...cards: Card[]): Hero {
    const hero = heroOf(LANCER_KIT)
    hero.decks[0].splice(0, hero.decks[0].length, ...cards)
    return hero
}

// --- Tests ---

describe("removeCards", () => {
    test("a card held twice, taken once → one left", () => {
        const hero = holding(STEP, STEP, THRUST)
        removeCards(hero.decks[0], [STEP])
        expect(hero.decks[0]).toEqual([STEP, THRUST])
    })

    test("a card not held → an error, the deck untouched", () => {
        const hero = holding(STEP)
        expect(() => removeCards(hero.decks[0], [STEP, THRUST])).toThrow()
        expect(hero.decks[0]).toEqual([STEP])
    })
})

describe("sacrifice", () => {
    test("two cards for a third → the two gone, a copy of the third", () => {
        const hero = holding(STEP, AIM, THRUST)
        sacrifice(hero.decks[0], [STEP, AIM], THRUST)
        expect(hero.decks[0]).toEqual([THRUST, THRUST])
    })

    test("the third among the sacrificed only → an error, the deck untouched", () => {
        const hero = holding(STEP, AIM, THRUST)
        expect(() => sacrifice(hero.decks[0], [STEP, AIM], STEP)).toThrow()
        expect([...hero.decks[0]].sort()).toEqual([STEP, AIM, THRUST].sort())
    })
})

describe("forge and cutFusions", () => {
    test("two cards forged then cut → the fusion, then the two back", () => {
        const hero = holding(REPEAT_2, THRUST, STEP)
        const fusion = forge(hero.decks[0], [REPEAT_2, THRUST])
        expect(hero.decks[0]).toEqual([STEP, fusion])
        cutFusions(hero.decks[0], [fusion])
        expect(hero.decks[0]).toEqual([STEP, REPEAT_2, THRUST])
    })

    test("a plain card cut → an error", () => {
        expect(() => cutFusions(holding(STEP).decks[0], [STEP])).toThrow()
    })
})

describe("transmute", () => {
    test("two copies → the upgraded card in their place", () => {
        const hero = holding(THRUST, THRUST, STEP)
        const fusion = transmute(hero.decks[0], THRUST, new FusionCard([REPEAT_2, THRUST]))
        expect(hero.decks[0]).toEqual([STEP, fusion])
    })
})

describe("possess", () => {
    test("a deck → fused by pairs, each reading whole, an element with no spell alone", () => {
        const hero = holding(FIRE, STEP, REPEAT_2, THRUST, SPELL)
        const deck = possess(hero.decks[0])
        expect(deck).toHaveLength(3)
        for(const card of deck) if(card.contents) expect(readsWhole(card.contents)).toBe(true)
        expect(deck.map(card => card.name)).toContain(`${SPELL.name} + ${FIRE.name}`)
    })

    test("fusions → fused again", () => {
        const hero = holding(new FusionCard([STEP, STEP]), new FusionCard([THRUST, THRUST]))
        expect(possess(hero.decks[0])).toHaveLength(1)
    })
})

describe("splitDeck", () => {
    test("an odd deck → as near halves as can be, every card kept, the new deck right after it", () => {
        const hero = holding(STEP, THRUST, AIM)
        hero.decks.push([REPEAT_2])
        const [deck] = hero.decks
        const made = splitDeck(hero, deck, new Rng(1))
        expect(deck).toHaveLength(2)
        expect(made).toHaveLength(1)
        expect(hero.decks[1]).toBe(made)
        expect([...deck, ...made].map(String).sort()).toEqual([STEP, THRUST, AIM].map(String).sort())
    })
})

describe("swapCards", () => {
    test("as many as picked on each side → gone over, even unequal", () => {
        const first = [STEP, THRUST]
        const second = [AIM]
        swapCards(first, [STEP, THRUST], second, [])
        expect(first).toEqual([])
        expect(second).toEqual([AIM, STEP, THRUST])
    })

    test("a card the deck does not hold → an error", () => {
        expect(() => swapCards([STEP], [AIM], [], [])).toThrow()
    })
})
