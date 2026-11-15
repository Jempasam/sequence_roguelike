import { describe, expect, test } from "vitest"
import { BACK_DASH, SLINGSHOT } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../../../fixtures"

// --- Tests ---

describe("slingshot", () => {
    test("at the end of the round the unit is flown past the slingshot, twice the way", () => {
        const on = battle()
        const hero = unit(on, 3.5, 3.5)
        unit(on, 6.5, 6.5, { team: MONSTERS })
        play(on, [[hero, chain(SLINGSHOT)]])
        // A meter from it, flown two meters: a meter past it.
        expect(hero.position.y).toBeCloseTo(3.5 - 2, 0)
    })

    test("a dash back before the end makes the flight longer", () => {
        const near = battle()
        const nearHero = unit(near, 3.5, 3.5)
        unit(near, 6.5, 6.5, { team: MONSTERS })
        play(near, [[nearHero, chain(SLINGSHOT)]])

        const far = battle()
        const farHero = unit(far, 3.5, 3.5)
        unit(far, 6.5, 6.5, { team: MONSTERS })
        play(far, [[farHero, chain(SLINGSHOT, BACK_DASH)]])

        expect(farHero.position.y).toBeLessThan(nearHero.position.y)
    })

    test("the unit it runs into is pushed on the way of the flight", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 6.5, 6.5, { team: MONSTERS })
        const foe = unit(on, 3.5, 4.2, { team: MONSTERS })
        play(on, [[hero, chain(SLINGSHOT)]])
        expect(foe.position.y).toBeLessThan(4.2)
    })

    test("a collision against the wall costs hearts to both, one for each two meters cut short", () => {
        const on = battle()
        const hero = unit(on, 3.5, 3)
        unit(on, 6.5, 6.5, { team: MONSTERS })
        // The foe just ahead of the flight, with the wall right behind it: nearly the whole push is cut short.
        const foe = unit(on, 3.5, 1.2, { team: MONSTERS })
        play(on, [[hero, chain(SLINGSHOT)]])
        expect(foe.life).toBeLessThan(4)
    })

    test("the slingshot is gone at the end of the round", () => {
        const on = battle()
        const hero = unit(on, 3.5, 3.5)
        unit(on, 6.5, 6.5, { team: MONSTERS })
        play(on, [[hero, chain(SLINGSHOT)]])
        expect(on.units.some(other => other.name === "Lance-pierre")).toBe(false)
    })
})
