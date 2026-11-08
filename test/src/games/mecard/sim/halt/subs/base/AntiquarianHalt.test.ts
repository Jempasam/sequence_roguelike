import { describe, expect, test } from "vitest"
import { appraisal, CHARGE, FusionCard, Rarity, RandomCard, sell, SHOT, SLASH, STEP, THRUST } from "@game/core/mecard"
import { startedRun } from "../../../../../../fixtures/startedRun"

// --- Tests ---

describe("appraisal", () => {
    test("a card alone → half its price", () => {
        expect(appraisal(STEP)).toBe(Math.round(STEP.rarity.price / 2))
    })

    test("two cards → their prices added up", () => {
        expect(appraisal(new FusionCard([STEP, THRUST]))).toBe(STEP.rarity.price + THRUST.rarity.price)
    })

    test("three cards → their prices added up, once and a half", () => {
        const prices = STEP.rarity.price + THRUST.rarity.price + SLASH.rarity.price
        expect(appraisal(new FusionCard([STEP, THRUST, SLASH]))).toBe(Math.round(prices * 1.5))
    })

    test("composites of every kind, nested → counted by the cards they hold in the end", () => {
        const nested = new FusionCard([new FusionCard([CHARGE, new RandomCard(SLASH, SHOT)]), STEP])
        const flat = new FusionCard([...CHARGE.contents ?? [], SLASH, SHOT, STEP])
        expect(appraisal(nested)).toBe(appraisal(flat))
    })

    test("what a composite is called does not count: only what it holds", () => {
        expect(CHARGE.rarity).toBe(Rarity.RARE)
        expect(appraisal(CHARGE)).toBe(appraisal(new FusionCard(CHARGE.contents ?? [])))
    })
})

describe("sell", () => {
    test("a card sold → gone from the deck, gold for it", () => {
        const run = startedRun(1)
        const hero = run.heroes[0]
        const copies = hero.decks[0].filter(card => card === STEP).length
        const gold = run.gold
        expect(sell(run, hero.decks[0], STEP)).toBe(appraisal(STEP))
        expect(run.gold).toBe(gold + appraisal(STEP))
        expect(hero.decks[0].filter(card => card === STEP)).toHaveLength(copies - 1)
    })
})
