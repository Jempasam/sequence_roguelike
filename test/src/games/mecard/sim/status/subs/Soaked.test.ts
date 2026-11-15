import { describe, expect, test } from "vitest"
import { Heart, POISON_POTION, POISONED, RED_HEART, soakOf, THRUST, Vector2 } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../../fixtures"

// --- Fixture builders ---

/** The soaking of a dose of poison, as a monster element gives it. */
const SOAKED_IN_POISON = soakOf({ potion: POISON_POTION, sign: 1, factor: 1 })

/** A hero thrusting at a sturdy foe right ahead, the first soaked or not. */
function thrust(soaked: boolean): ReturnType<typeof unit> {
    const on = battle()
    const hero = unit(on, 3, 5)
    const foe = unit(on, 3, 4, { team: MONSTERS, hearts: Heart.many(RED_HEART, 12), direction: Vector2.DOWN })
    if(soaked) on.applyStatus(hero, SOAKED_IN_POISON, 2)
    play(on, [[hero, chain(THRUST)]])
    return foe
}

// --- Tests ---

describe("Soaked", () => {
    test("a blow that lands → its potion poured on what it hit", () => {
        expect(thrust(true).statusOf(POISONED)).toBeDefined()
    })

    test("a blow with no soaking → no potion poured", () => {
        expect(thrust(false).statusOf(POISONED)).toBeUndefined()
    })

    test("a round over → still soaked, unlike a coat", () => {
        const on = battle()
        const hero = unit(on, 3, 5)
        on.applyStatus(hero, SOAKED_IN_POISON, 2)
        play(on, [[hero, chain(THRUST)]])
        expect(hero.statusOf(SOAKED_IN_POISON)).toBeDefined()
    })
})
