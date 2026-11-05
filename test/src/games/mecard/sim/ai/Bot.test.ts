import { describe, expect, test } from "vitest"
import { AIM, FIRE, GAMBLE, planFor, SLASH, STEP, TURN_RIGHT } from "@game/core/mecard"
import type { Card } from "@game/core/mecard"

import { battle, MONSTERS, unit } from "../fixtures"

// --- Tests ---

describe("planFor", () => {
    /** The chain a bot plays from a hand, as text. */
    function planned(...hand: Card[]): string {
        const on = battle()
        const bot = unit(on, 3, 3, { team: MONSTERS, hand })
        return planFor(bot).roots.map(root => root.cards.map(card => card.name).join("/")).join(" > ")
    }

    test("actions → played from left to right", () => {
        expect(planned(AIM, STEP, SLASH)).toBe("Viser > Avancer > Coup d'épée")
    })

    test("a modifier → takes the card after it as its input", () => {
        expect(planned(GAMBLE, SLASH, STEP)).toBe("50 %/Coup d'épée > Avancer")
    })

    test("a modifier last, its slot empty → waits in the hand", () => {
        expect(planned(STEP, GAMBLE)).toBe("Avancer")
    })

    test("an element first → nothing played", () => {
        expect(planned(FIRE, STEP)).toBe("")
    })

    test("5 cards → the first 4", () => {
        expect(planned(STEP, STEP, STEP, STEP, TURN_RIGHT)).toBe("Avancer > Avancer > Avancer > Avancer")
    })
})
