import { describe, expect, test } from "vitest"
import { GLASS_KNIFE } from "@game/core-src/games/mecard/sim/card/subs/attack/GlassKnife"
import { BEAR_TRAP } from "@game/core-src/games/mecard/sim/card/subs/combat/Bomb"
import { MISDIRECTION, REFLECTION } from "@game/core-src/games/mecard/sim/card/subs/modifier/Mimicry"
import { KICK, SHY_AWAY, STRIDE } from "@game/core-src/games/mecard/sim/card/subs/movement/HorseCards"
import { STEP } from "@game/core-src/games/mecard/sim/card/subs/movement/Step"
import { BEAR_TRAP_HAZARD } from "@game/core-src/games/mecard/sim/hazard/subs/BearTrap"
import { DODGE } from "@game/core-src/games/mecard/sim/status/subs/Dodge"

import { battle, chain, MONSTERS, play, unit } from "../../../fixtures"

// --- Tests ---

describe("stride", () => {
    test("an ally beside the way gains a dodge, an enemy beside it is moved aside", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const ally = unit(on, 4.28, 5)
        const foe = unit(on, 2.72, 5, { team: MONSTERS })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        let given = false
        on.signals.statusAdded.add(({ unit: holder, type }) => { if(holder === ally && type === DODGE) given = true })
        play(on, [[hero, chain(STRIDE, STEP)]])
        expect(given).toBe(true)
        expect(Math.abs(foe.position.x - 2.72)).toBeGreaterThan(0.3)
    })
})

describe("shy away", () => {
    test("the nearest unit is pushed to the right of the unit", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const other = unit(on, 3.5, 4.5, { team: MONSTERS })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(SHY_AWAY)]])
        expect(Math.abs(other.position.x - 3.5)).toBeGreaterThan(1)
    })
})

describe("kick", () => {
    test("a unit just behind is hurt and thrown back", () => {
        const on = battle()
        const hero = unit(on, 3.5, 3)
        const behind = unit(on, 3.5, 3.9, { team: MONSTERS })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(KICK)]])
        expect(behind.life).toBeLessThan(4)
        expect(behind.position.y).toBeGreaterThan(3.9)
    })
})

describe("bear trap", () => {
    test("the first unit to touch it is hurt, and the trap is gone", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        // Laid a meter ahead, the trap is on the way of the step of the unit that laid it.
        play(on, [[hero, chain(BEAR_TRAP, STEP)]])
        expect(hero.life).toBeLessThan(4)
        expect(on.units.some(each => each.alive && each.statuses.has(BEAR_TRAP_HAZARD))).toBe(false)
    })
})

describe("glass knife", () => {
    test("it hurts the enemy in front and costs the user the hearts the enemies lost, less the strength", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const foe = unit(on, 3.5, 5, { team: MONSTERS })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(GLASS_KNIFE)]])
        expect(foe.life).toBeLessThan(4)
        // One heart lost by the enemy, no strength: one heart back on the unit.
        expect(hero.life).toBeLessThan(4)
    })

    test("the strength is taken off what comes back: a strong unit pays the base heart only", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        hero.stats.strength.base = 3
        const foe = unit(on, 3.5, 5, { team: MONSTERS })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(GLASS_KNIFE)]])
        expect(foe.life).toBeLessThan(4)
        expect(hero.life).toBe(3)
    })
})

describe("reflection", () => {
    test("the enemies near play the last action of the unit", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const foe = unit(on, 3.5, 4.5, { team: MONSTERS })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        const before = foe.position.y
        play(on, [[hero, chain(STEP, REFLECTION)]])
        expect(foe.position.y).not.toBeCloseTo(before, 1)
    })
})

describe("misdirection", () => {
    test("the first enemy to copy the action plays it the wrong way round", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const foe = unit(on, 5.5, 4.5, { team: MONSTERS })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(MISDIRECTION, STEP, REFLECTION)]])
        // The step goes up; the copy goes down, from behind.
        expect(foe.position.y).toBeGreaterThan(4.5)
    })
})
