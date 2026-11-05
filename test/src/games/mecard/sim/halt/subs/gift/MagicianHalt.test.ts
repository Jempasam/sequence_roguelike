import { describe, expect, test } from "vitest"
import { booster, readsWhole, Rng } from "@game/core/mecard"

// --- Tests ---

describe("booster", () => {
    test("any seed → its head taking the card after it", () => {
        for(let seed = 1; seed < 40; seed++){
            const { head, cards } = booster(new Rng(seed))
            expect(cards[0]).toBe(head)
            expect(readsWhole([head, cards[1]])).toBe(true)
        }
    })
})
