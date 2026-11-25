import { describe, expect, test } from "vitest"
import { deckFaceOf } from "@game/core/mecard/colors"

// --- Tests ---

describe("the face of a card by its deck", () => {
    test("each of the ten decks → its own face", () => {
        const faces = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(deck => {
            const { r, g, b } = deckFaceOf(deck, false)
            return `${r},${g},${b}`
        })
        expect(new Set(faces).size).toBe(10)
    })

    test("the colors come back in turn → the eleventh deck looks like the first", () => {
        expect(deckFaceOf(10, false)).toEqual(deckFaceOf(0, false))
    })

    test("the pointer over a card → a lighter face", () => {
        const plain = deckFaceOf(1, false)
        const lit = deckFaceOf(1, true)
        expect(lit.r + lit.g + lit.b).toBeGreaterThan(plain.r + plain.g + plain.b)
    })

    test("a card from no deck → paper, the same as a deck's under no color", () => {
        expect(deckFaceOf(null, false)).toBe(deckFaceOf(null, false))
        expect(deckFaceOf(null, false)).not.toBe(deckFaceOf(0, false))
    })
})
