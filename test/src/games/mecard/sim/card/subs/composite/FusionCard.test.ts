import { describe, expect, test } from "vitest"
import {
    cardCount, CLONE, cut, FusionCard, heldCards, isFusion, PREPARATION, REPEAT_2, STEP, THRUST, Rarity,
    UNSTABLE_THRUST,
} from "@game/core/mecard"

// --- Tests ---

describe("FusionCard.constructor", () => {
    test("two cards → named by both, holding them", () => {
        const fusion = new FusionCard([REPEAT_2, THRUST])
        expect(fusion.name).toBe(`${REPEAT_2.name} + ${THRUST.name}`)
        expect(fusion.contents).toEqual([REPEAT_2, THRUST])
        expect(fusion.named).toBe(false)
        expect(isFusion(fusion)).toBe(true)
    })

    test("a common and an epic card → epic", () => {
        expect(new FusionCard([STEP, CLONE]).rarity).toBe(Rarity.EPIC)
    })

    test("a fusion of the catalog → its own name and rarity", () => {
        expect(UNSTABLE_THRUST.named).toBe(true)
        expect(UNSTABLE_THRUST.rarity).toBe(Rarity.RARE)
    })

    test("one card → an error", () => {
        expect(() => new FusionCard([STEP])).toThrow()
    })

    test("its value → a preparation, its cards in place of it, in order, nothing acting", () => {
        const fusion = new FusionCard([STEP, THRUST])
        expect(fusion.output).toBe(PREPARATION)
        const spot = { next: null, rest: [], deck: [], trial: false, fits: () => true }
        const rewrite = fusion.get().rewrite({ pick: options => options[0] }, spot)
        expect(rewrite).toEqual({ cards: [STEP, THRUST], consumed: 0, acting: false })
    })
})

describe("cut", () => {
    test("a fusion of a fusion → one level down", () => {
        const inner = new FusionCard([STEP, THRUST])
        expect(cut(new FusionCard([inner, STEP]))).toEqual([inner, STEP])
    })

    test("a plain card → an error", () => {
        expect(() => cut(STEP)).toThrow()
    })
})

describe("cardCount", () => {
    test("plain 1, a fusion of the catalog its cards, a fusion of both the sum", () => {
        expect(cardCount(STEP)).toBe(1)
        expect(cardCount(UNSTABLE_THRUST)).toBe(3)
        expect(cardCount(new FusionCard([STEP, UNSTABLE_THRUST]))).toBe(4)
    })
})

describe("heldCards", () => {
    test("nested fusions → every card, in order", () => {
        const nested = new FusionCard([new FusionCard([REPEAT_2, THRUST]), STEP])
        expect(heldCards(nested)).toEqual([REPEAT_2, THRUST, STEP])
    })
})
