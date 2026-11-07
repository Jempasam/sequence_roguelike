import { describe, expect, test } from "vitest"
import {
    BATTERING_RAM, CATCH, PROJECTION, SHOCK_WAVE, SLING_CARD, SUCTION, TIDE,
} from "@game/core/mecard"

import { battle, chain, HEROES, MONSTERS, play, unit } from "../../../fixtures"

// --- Tests ---

describe("PROJECTION", () => {
    test("a unit in the sector is thrown 2.5 m ahead", () => {
        const on = battle()
        const thrower = unit(on, 3.5, 5.5)
        const foe = unit(on, 3.5, 4.7, { team: MONSTERS })
        play(on, [[thrower, chain(PROJECTION)]])
        expect(foe.position.y).toBeCloseTo(2.2, 1)
        expect(foe.life).toBe(4)
    })

    test("against another unit, both take 2 + strength", () => {
        const on = battle()
        const thrower = unit(on, 3.5, 5.5)
        const foe = unit(on, 3.5, 4.7, { team: MONSTERS })
        const wall = unit(on, 3.5, 3.2, { team: MONSTERS })
        play(on, [[thrower, chain(PROJECTION)]])
        expect(foe.life).toBe(2)
        expect(wall.life).toBe(2)
    })

    test("an ally in the sector is thrown too", () => {
        const on = battle()
        const thrower = unit(on, 3.5, 5.5)
        const ally = unit(on, 3.5, 4.7, { team: HEROES })
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[thrower, chain(PROJECTION)]])
        expect(ally.position.y).toBeLessThan(3)
    })
})

describe("SUCTION", () => {
    test("pulls a unit to the contact, no damage", () => {
        const on = battle()
        const sucker = unit(on, 3.5, 3.5)
        const foe = unit(on, 3.5, 6, { team: MONSTERS })
        play(on, [[sucker, chain(SUCTION)]])
        expect(foe.position.distance(sucker.position)).toBeLessThan(0.9)
        expect(foe.life).toBe(4)
    })
})

describe("CATCH", () => {
    test("brings a unit to 1 m ahead and hurts it by 1", () => {
        const on = battle()
        const catcher = unit(on, 3.5, 6)
        const foe = unit(on, 3.5, 4, { team: MONSTERS })
        play(on, [[catcher, chain(CATCH)]])
        expect(foe.position.y).toBeCloseTo(5, 1)
        expect(foe.life).toBe(3)
    })
})

describe("BATTERING_RAM", () => {
    test("runs into the first unit and throws it", () => {
        const on = battle()
        const ram = unit(on, 3.5, 6)
        const foe = unit(on, 3.5, 4.8, { team: MONSTERS })
        play(on, [[ram, chain(BATTERING_RAM)]])
        expect(foe.position.y).toBeLessThan(3.5)
    })
})

describe("SLING_CARD", () => {
    test("throws the unit ahead over the thrower to 2.5 m behind", () => {
        const on = battle()
        const slinger = unit(on, 3.5, 3.5)
        const foe = unit(on, 3.5, 2.2, { team: MONSTERS })
        play(on, [[slinger, chain(SLING_CARD)]])
        expect(foe.position.y).toBeCloseTo(6, 1)
        expect(foe.life).toBe(4)
    })
})

describe("SHOCK_WAVE", () => {
    test("throws a unit away from the center", () => {
        const on = battle()
        const waver = unit(on, 3.5, 3.5)
        const foe = unit(on, 4.5, 3.5, { team: MONSTERS })
        play(on, [[waver, chain(SHOCK_WAVE)]])
        expect(foe.position.x).toBeCloseTo(6, 1)
    })
})

describe("TIDE", () => {
    test("carries what is ahead by 2 m", () => {
        const on = battle()
        const tider = unit(on, 3.5, 6.5)
        const foe = unit(on, 3.5, 4, { team: MONSTERS })
        play(on, [[tider, chain(TIDE)]])
        expect(foe.position.y).toBeCloseTo(2, 1)
    })
})
