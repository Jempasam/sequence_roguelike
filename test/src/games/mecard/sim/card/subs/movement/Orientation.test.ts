import { describe, expect, test } from "vitest"
import { ABOUT_FACE, ALLY_AIM, ENERGETIC_AIM, ORIENTATION, SHOUT, TAUNT } from "@game/core/mecard"

import { battle, chain, HEROES, MONSTERS, play, unit } from "../../../fixtures"

// --- Tests ---

describe("SHOUT and TAUNT", () => {
    test("shout → the unit around turns its back to the shouter, an ally too", () => {
        const on = battle()
        const shouter = unit(on, 5, 5)
        const ally = unit(on, 5, 4.2, { team: HEROES })
        const foe = unit(on, 6, 5, { team: MONSTERS })
        play(on, [[shouter, chain(SHOUT)]])
        expect(ally.direction.y).toBeLessThan(-0.99)
        expect(foe.direction.x).toBeGreaterThan(0.99)
    })

    test("taunt → the unit around faces the taunter", () => {
        const on = battle()
        const taunter = unit(on, 5, 5)
        const foe = unit(on, 6, 5, { team: MONSTERS })
        play(on, [[taunter, chain(TAUNT)]])
        expect(foe.direction.x).toBeLessThan(-0.99)
    })

    test("a unit out of the circle stays as it is", () => {
        const on = battle()
        const shouter = unit(on, 5, 5)
        const far = unit(on, 9, 5, { team: MONSTERS })
        const before = far.direction
        play(on, [[shouter, chain(SHOUT)]])
        expect(far.direction.equals(before)).toBe(true)
    })
})

describe("ORIENTATION", () => {
    test("more enemies on the right → turns an eighth to the right", () => {
        const on = battle()
        const turner = unit(on, 5, 5)
        unit(on, 7, 5, { team: MONSTERS })
        unit(on, 8, 5, { team: MONSTERS })
        unit(on, 3, 5, { team: MONSTERS })
        play(on, [[turner, chain(ORIENTATION)]])
        expect(turner.direction.x).toBeGreaterThan(0.5)
        expect(turner.direction.y).toBeLessThan(-0.5)
    })

    test("a tie → nothing", () => {
        const on = battle()
        const turner = unit(on, 5, 5)
        unit(on, 7, 5, { team: MONSTERS })
        unit(on, 3, 5, { team: MONSTERS })
        const before = turner.direction
        play(on, [[turner, chain(ORIENTATION)]])
        expect(turner.direction.equals(before)).toBe(true)
    })
})

describe("aims", () => {
    test("energetic aim → turns to the enemy behind and stuns it", () => {
        const on = battle()
        const aimer = unit(on, 5, 5)
        unit(on, 5, 6, { team: MONSTERS })
        const [root] = chain(ENERGETIC_AIM).preview(on, aimer)
        expect(root.preview?.indicators.map(indicator => indicator.kind)).toEqual(["polygon", "arrow", "label"])
        play(on, [[aimer, chain(ENERGETIC_AIM)]])
        expect(aimer.direction.y).toBeGreaterThan(0.99)
    })

    test("ally aim → turns to the nearest ally, itself excluded", () => {
        const on = battle()
        const aimer = unit(on, 5, 5)
        unit(on, 7, 5, { team: HEROES })
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[aimer, chain(ALLY_AIM)]])
        expect(aimer.direction.x).toBeGreaterThan(0.99)
    })
})

describe("ABOUT_FACE", () => {
    test("turns around and stuns the unit just behind", () => {
        const on = battle()
        const turner = unit(on, 5, 5)
        unit(on, 5, 5.6, { team: MONSTERS })
        play(on, [[turner, chain(ABOUT_FACE)]])
        expect(turner.direction.y).toBeGreaterThan(0.99)
    })
})
