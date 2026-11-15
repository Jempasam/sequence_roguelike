import { describe, expect, test } from "vitest"
import { COLLISION, DRAFT, STEP } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../../../fixtures"

// --- Tests ---

describe("collision", () => {
    test("a move stopped by a unit pushes it ahead, away from the mover", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const foe = unit(on, 3.5, 4.6, { team: MONSTERS })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(COLLISION, STEP)]])
        expect(foe.position.y).toBeLessThan(3.8)
        expect(foe.position.x).toBeCloseTo(3.5, 1)
    })

    test("the unit pushed is hurt if it is stopped short in turn", () => {
        const on = battle()
        const hero = unit(on, 3.5, 3.5)
        const foe = unit(on, 3.5, 1.9, { team: MONSTERS })
        unit(on, 6.5, 6.5, { team: MONSTERS })
        // Pushed against the wall behind it.
        play(on, [[hero, chain(COLLISION, STEP)]])
        expect(foe.life).toBe(3)
    })

    test("a move that stops against nothing pushes nothing", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const foe = unit(on, 6, 6, { team: MONSTERS })
        play(on, [[hero, chain(COLLISION, STEP)]])
        expect(foe.position.x).toBeCloseTo(6, 1)
    })
})

describe("draft", () => {
    test("units beside the way of a move are pushed along it", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const foe = unit(on, 4.2, 5, { team: MONSTERS })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(DRAFT, STEP)]])
        // The way goes up: the foe beside it goes up too, and stays beside it.
        expect(foe.position.y).toBeLessThan(5)
        expect(foe.position.x).toBeCloseTo(4.2, 1)
        expect(foe.life).toBe(4)
    })

    test("units far from the way stay where they are", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const foe = unit(on, 6.5, 5, { team: MONSTERS })
        play(on, [[hero, chain(DRAFT, STEP)]])
        expect(foe.position.y).toBeCloseTo(5, 1)
    })
})
