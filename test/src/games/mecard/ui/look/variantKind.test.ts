import { describe, expect, test } from "vitest"
import { colored, rgba } from "@game/core-src/games/mecard/sim/base/Rgba"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { TURNS } from "@game/core-src/games/mecard/sim/card/subs/movement/TurnCard"
import { WALKS } from "@game/core-src/games/mecard/sim/card/subs/movement/WalkCard"
import { UNIVERSAL_ELEMENTS } from "@game/core-src/games/mecard/sim/card/subs/spell/UniversalElementCard"
import type { Card } from "@game/core-src/games/mecard/sim/card/Card"
import { keyColorOf, MAX_CHIPS, variantEntries, variantKindOf } from "@game/core/mecard/variant-kind"
import type { VariantEntry } from "@game/core/mecard/variant-kind"
import type { Text } from "@game/core-src/semantic/Text"

// --- Fixture builders ---

/** Entries of a card, each key given, all of one card: only the keys are looked at. */
function keyed(keys: readonly Text[]): VariantEntry[] {
    return keys.map(key => ({ key, card: STEP as Card }))
}

// --- Tests ---

describe("variantKindOf", () => {
    test("a card with nothing to choose → none", () => {
        expect(variantKindOf(variantEntries(STEP))).toBeNull()
        expect(variantKindOf(keyed(["seule"]))).toBeNull()
    })

    test("the turns, directions all around → a dial", () => {
        expect(variantKindOf(variantEntries(TURNS[0]))).toBe("dial")
    })

    test("the elements, colors far apart → dots of color", () => {
        expect(variantKindOf(variantEntries(UNIVERSAL_ELEMENTS[0]))).toBe("colors")
    })

    test("the walks, numbers → a stepper, the least first", () => {
        expect(variantKindOf(variantEntries(WALKS[0]))).toBe("stepper")
    })

    test("numbers listed out of order → sorted, whatever the card says", () => {
        const card = { variants: () => new Map<Text, Card>([[3, STEP], [1, STEP], [2, STEP]]) } as unknown as Card
        expect(variantEntries(card).map(entry => entry.key)).toEqual([1, 2, 3])
        const named = { variants: () => new Map<Text, Card>([["b", STEP], ["a", STEP]]) } as unknown as Card
        expect(variantEntries(named).map(entry => entry.key)).toEqual(["b", "a"])
    })

    test("colors too close to tell apart → chips, not dots", () => {
        const near = keyed([colored(rgba(0.5, 0.5, 0.5), "gris"), colored(rgba(0.52, 0.5, 0.5), "gris clair")])
        expect(variantKindOf(near)).toBe("chips")
    })

    test("more keys than room for chips → a stepper, whatever they are", () => {
        const many = Array.from({ length: MAX_CHIPS + 1 }, (_, index) => `valeur ${index}`)
        expect(variantKindOf(keyed(many))).toBe("stepper")
        expect(variantKindOf(keyed(many.slice(0, MAX_CHIPS)))).toBe("chips")
    })

    test("directions not spread evenly from the top → not a dial", () => {
        const [first, second] = [...TURNS[0].variants()].map(([key]) => key)
        expect(variantKindOf(keyed([second, first]))).toBe("chips")
    })
})

describe("keyColorOf", () => {
    test("a colored text, or an object telling itself as one → its color", () => {
        expect(keyColorOf(colored(rgba(1, 0, 0), "rouge"))?.slice(0, 3)).toEqual([1, 0, 0])
        const [key] = [...UNIVERSAL_ELEMENTS[0].variants()].map(([each]) => each)
        expect(keyColorOf(key)?.length).toBeGreaterThanOrEqual(3)
    })

    test("a string, a number or a list → none", () => {
        expect(keyColorOf("texte")).toBeNull()
        expect(keyColorOf(3)).toBeNull()
        expect(keyColorOf(["a", "b"])).toBeNull()
    })
})
