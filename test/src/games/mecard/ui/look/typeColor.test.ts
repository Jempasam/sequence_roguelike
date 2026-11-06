import { describe, expect, test } from "vitest"
import { ACTION, CardType, ELEMENT, MODULE, POTION, PREPARATION } from "@game/core/mecard"
import { typeColorOf } from "@game/core/mecard/colors"

// --- Tests ---

describe("a card type's color", () => {
    test("each known type has its own", () => {
        const colors = [ACTION, PREPARATION, ELEMENT, POTION, MODULE].map(type => {
            const { r, g, b } = typeColorOf(type)
            return `${r},${g},${b}`
        })
        expect(new Set(colors).size).toBe(colors.length)
    })

    test("an unknown type → a color hashed from its name, the same each time", () => {
        const a = typeColorOf(new CardType<unknown>("rune"))
        const b = typeColorOf(new CardType<unknown>("rune"))
        expect(a).toBe(b)
        const other = typeColorOf(new CardType<unknown>("glyphe"))
        expect([other.r, other.g, other.b]).not.toEqual([a.r, a.g, a.b])
    })
})
