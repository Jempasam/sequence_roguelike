import { describe, expect, test } from "vitest"
import {
    ANTIDOTE, Arena, Battle, BIG_BOTTLE, BOTTLE, COATED_BLADE, CONFUSED, CONFUSION, DISTILLATION, ENRAGED,
    Heart, Poison, POISON, POISONED, POTION_LEVEL, POTION_RAIN, PUDDLE, RAGE, RAGE_FIT,
    RED_HEART, SLASH, SLOWED, SLOWNESS, STEP, THORN_HEART, THROWN_POTION, Vector2, VULNERABILITY,
    Vulnerability, VULNERABLE, WAIT,
} from "@game/core/mecard"
import type { RoundStatus, StatusType, Unit } from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, play, unit } from "../fixtures"

/** Hearts enough to count every half lost. */
function sturdy(): Heart[] {
    return Heart.many(RED_HEART, 16)
}

/** The rounds a status of a kind has left on a unit, none when it holds none. */
function roundsOf(unit: Unit, type: StatusType): number|undefined {
    return (unit.statusOf(type) as RoundStatus|undefined)?.rounds
}

// --- Tests ---

describe("the level of a potion", () => {
    test("a bottle → the base level, counted down once at the end of its round", () => {
        const on = battle()
        const drinker = unit(on, 3, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[drinker, chain(BOTTLE, SLOWNESS)]])
        expect(roundsOf(drinker, SLOWED)).toBe(POTION_LEVEL - 1)
    })

    test("alchemy, a big bottle, a distillation → each adding to the level", () => {
        const on = battle()
        const drinker = unit(on, 3, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        drinker.stats.alchemy.base = 1
        play(on, [[drinker, chain(BIG_BOTTLE, DISTILLATION, SLOWNESS)]])
        expect(roundsOf(drinker, SLOWED)).toBe((POTION_LEVEL + 1) * 2 * 2 - 1)
    })

    test("an antidote → the rounds taken off, the status gone once none is left", () => {
        const on = battle()
        const drinker = unit(on, 3, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        on.applyStatus(drinker, new Poison(3))
        play(on, [[drinker, chain(BOTTLE, ANTIDOTE, POISON)]])
        expect(drinker.statusOf(POISONED)).toBeUndefined()
    })
})

describe("Poison", () => {
    test("3 rounds → 3 halves, then 2, then 1", () => {
        const on = battle()
        const target = unit(on, 3, 5, { team: MONSTERS, hearts: sturdy() })
        const player = unit(on, 0.5, 0.5)
        on.applyStatus(target, new Poison(3))
        const lost: number[] = []
        for(let round = 0; round < 4; round++){
            const before = target.life
            play(on, [[player, chain(WAIT)]])
            lost.push(before - target.life)
        }
        expect(lost).toEqual([3, 2, 1, 0])
    })
})

describe("Vulnerability", () => {
    test("a wound → a half more, once", () => {
        const on = battle()
        const target = unit(on, 3, 5, { team: MONSTERS, hearts: sturdy() })
        on.applyStatus(target, new Vulnerability(2))
        target.hearts.damage(2, "physical", null)
        expect(16 - target.life).toBe(3)
    })

    test("two vulnerable units of thorns striking each other → it ends", () => {
        const on = battle()
        const thorny = () => [...sturdy(), ...Heart.many(THORN_HEART, 2)]
        const a = unit(on, 3, 5, { hearts: thorny() })
        const b = unit(on, 3, 4, { team: MONSTERS, hearts: thorny() })
        on.applyStatus(a, new Vulnerability(2))
        on.applyStatus(b, new Vulnerability(2))
        b.hearts.damage(2, "physical", a)
        expect(a.alive && b.alive).toBe(true)
    })

    test("thrown → on every unit of the splash", () => {
        const on = battle()
        const thrower = unit(on, 3, 6)
        const target = unit(on, 3, 3.5, { team: MONSTERS })
        play(on, [[thrower, chain(THROWN_POTION, VULNERABILITY)]])
        expect(roundsOf(target, VULNERABLE)).toBe(POTION_LEVEL - 1)
    })
})

describe("Rage", () => {
    test("before a step → turned at an enemy", () => {
        const on = battle()
        const angry = unit(on, 3, 5)
        unit(on, 6, 5, { team: MONSTERS })
        play(on, [[angry, chain(RAGE_FIT, STEP)]])
        expect(angry.statusOf(ENRAGED)).toBeDefined()
        expect(angry.direction).toEqual(Vector2.RIGHT)
    })

    test("its fused card → a bottle of rage", () => {
        expect(RAGE_FIT.contents).toEqual([BOTTLE, RAGE])
    })
})

describe("Confusion", () => {
    test("the same seed → the same ways", () => {
        const facing = (seed: number): string => {
            const on = new Battle(new Arena(7, 7), seed)
            const lost = unit(on, 3, 5)
            unit(on, 0.5, 0.5, { team: MONSTERS })
            const ways: string[] = []
            lost.stepStarted.add(() => ways.push(lost.direction.toString()))
            play(on, [[lost, chain(BOTTLE, CONFUSION)]])
            play(on, [[lost, chain(WAIT)]])
            return ways.join(" ")
        }
        expect(facing(9)).toBe(facing(9))
    })

    test("rained → on every unit around, the caster included", () => {
        const on = battle()
        const caster = unit(on, 3, 5)
        const near = unit(on, 4, 5, { team: MONSTERS })
        play(on, [[caster, chain(POTION_RAIN, CONFUSION)]])
        expect(caster.statusOf(CONFUSED)).toBeDefined()
        expect(near.statusOf(CONFUSED)).toBeDefined()
    })
})

describe("COATED_BLADE", () => {
    test("then a slash → the potion poured on what it hit", () => {
        const on = battle()
        const coater = unit(on, 3, 5)
        const target = unit(on, 3, 4, { team: MONSTERS, hearts: sturdy() })
        play(on, [[coater, chain(COATED_BLADE, POISON, SLASH)]])
        // Poisoned by the slash, the end of the round took a round off.
        expect(roundsOf(target, POISONED)).toBe(POTION_LEVEL - 1)
    })
})

describe("PUDDLE", () => {
    test("stepped into → poured on whoever enters, and it lasts three rounds", () => {
        const on = battle()
        const pourer = unit(on, 3, 6)
        const walker = unit(on, 3, 2.4, { team: MONSTERS, direction: Vector2.DOWN, hearts: sturdy() })
        play(on, [[pourer, chain(PUDDLE, SLOWNESS)], [walker, chain(STEP)]])
        expect(on.living.some(each => each.summoned === "puddle")).toBe(true)
        expect(walker.statusOf(SLOWED)).toBeDefined()
        play(on, [[pourer, chain(WAIT)]])
        play(on, [[pourer, chain(WAIT)]])
        expect(on.units.some(each => each.summoned === "puddle")).toBe(false)
        expectAt(pourer, 3, 6)
    })
})
