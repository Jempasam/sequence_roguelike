import { describe, expect, test } from "vitest"
import {
    BLEED, BLOCK, BLEEDING, BLUE_HEART, Concentration, CONCENTRATED, CONCENTRATION, COOL_HEAD,
    EXPLOSIVE_HEART, EXPLOSIVE_SHELL, FRAGILE, FRAGILITY_CARD, GRUDGE, HEMORRHAGE, MARK_CARD, POISONED, RAMPART, SOUL_LINKED,
    SOUL_SHIELDED, SUCTION, WAIT, WEAKENING_BLOWS, DEMONIC,
} from "@game/core/mecard"

import { battle, chain, HEROES, MONSTERS, play, unit } from "../../../fixtures"

/** The kinds of status a battle gave, in order: a status of a round is gone with it. */
function statusesGiven(on: ReturnType<typeof battle>): unknown[] {
    const given: unknown[] = []
    on.signals.statusAdded.add(({ type }) => given.push(type))
    return given
}

/** How many hearts of a unit came into its bar. */
function heartsGiven(target: ReturnType<typeof unit>): unknown[] {
    const given: unknown[] = []
    target.hearts.onAdd.add(({ heart }) => given.push(heart.kind))
    return given
}

// --- Tests ---

describe("echo damage", () => {
    test("an echo takes hearts but sets off no wound listener", () => {
        const on = battle()
        const target = unit(on, 3, 3)
        let wounds = 0
        let echoes = 0
        target.hearts.onDamage.add(() => wounds++)
        target.hearts.onEcho.add(() => echoes++)
        target.hearts.echo(1, "physical", null)
        expect(target.life).toBe(3)
        expect(wounds).toBe(0)
        expect(echoes).toBe(1)
    })
})

describe("soul bonds", () => {
    test("a link repeats a wound to the others, with no loop", () => {
        const on = battle()
        const a = unit(on, 2, 2)
        const b = unit(on, 5, 5, { team: MONSTERS })
        on.applyStatus(a, SOUL_LINKED, 2)
        on.applyStatus(b, SOUL_LINKED, 2)
        a.hearts.damage(2, "physical", null)
        expect(a.life).toBe(2)
        expect(b.life).toBe(2)
        expect(a.statuses.has(SOUL_LINKED)).toBe(true)
    })

    test("a shield shares a wound among the bound", () => {
        const on = battle()
        const a = unit(on, 2, 2)
        const b = unit(on, 5, 5, { team: MONSTERS })
        on.applyStatus(a, SOUL_SHIELDED, 2)
        on.applyStatus(b, SOUL_SHIELDED, 2)
        a.hearts.damage(2, "physical", null)
        expect(a.life).toBe(3)
        expect(b.life).toBe(3)
        expect(a.statuses.has(SOUL_SHIELDED)).toBe(true)
    })
})

describe("weakening blows", () => {
    test("each wound is followed by an echo of 1 + strength until the round ends", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        const foe = unit(on, 3.5, 4.4, { team: MONSTERS })
        play(on, [[hero, chain(WEAKENING_BLOWS)]])
        foe.hearts.damage(1, "physical", hero)
        // The process of the round is gone: only the wound lands.
        expect(foe.life).toBe(3)
    })
})

describe("bleeding", () => {
    test("each move costs exactly a heart, one carried by another too", () => {
        const on = battle()
        const sucker = unit(on, 3.5, 3.5)
        const foe = unit(on, 3.5, 6, { team: MONSTERS })
        on.applyStatus(foe, BLEEDING, 3)
        play(on, [[sucker, chain(SUCTION)]])
        expect(foe.life).toBe(3)
        expect(foe.statuses.has(BLEEDING)).toBe(true)
    })

    test("bleed gives it, hemorrhage doubles it", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        const foe = unit(on, 3.5, 4.4, { team: MONSTERS })
        const given = statusesGiven(on)
        play(on, [[hero, chain(BLEED)]])
        expect(given).toContain(BLEEDING)
        on.applyStatus(foe, BLEEDING, 2)
        play(on, [[hero, chain(HEMORRHAGE)]])
        // Doubled to 4, then one round gone: 3 left.
        expect(foe.statuses.get(BLEEDING)?.level).toBe(3)
    })
})

describe("marks and fragility", () => {
    test("the mark doubles the next attack, once", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        const foe = unit(on, 3.5, 4.4, { team: MONSTERS })
        play(on, [[hero, chain(MARK_CARD)]])
        foe.hearts.damage(1, "physical", hero)
        expect(foe.life).toBe(2)
        foe.hearts.damage(1, "physical", hero)
        expect(foe.life).toBe(1)
    })

    test("fragility adds a heart to each wound", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        const foe = unit(on, 3.5, 4.4, { team: MONSTERS })
        const given = statusesGiven(on)
        play(on, [[hero, chain(FRAGILITY_CARD)]])
        expect(given).toContain(FRAGILE)
        on.applyStatus(foe, FRAGILE, 2)
        foe.hearts.damage(1, "physical", hero)
        expect(foe.life).toBe(2)
    })
})

describe("concentration", () => {
    test("a wait adds a round, and the vision follows the rounds", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        unit(on, 1, 1, { team: MONSTERS })
        const vision = hero.stats.aimRange.value
        play(on, [[hero, chain(CONCENTRATION, WAIT)]])
        const status = hero.statuses.get(CONCENTRATED) as Concentration
        expect(status).toBeDefined()
        expect(hero.stats.aimRange.value).toBeGreaterThan(vision)
    })

    test("cool head removes the negative status and gives a round each", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        unit(on, 1, 1, { team: MONSTERS })
        on.applyStatus(hero, POISONED, 5)
        const given = statusesGiven(on)
        play(on, [[hero, chain(COOL_HEAD)]])
        expect(hero.statuses.has(POISONED)).toBe(false)
        expect(given).toContain(CONCENTRATED)
    })
})

describe("hearts", () => {
    test("grudge feeds the demonic energy on each wound", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        unit(on, 1, 1, { team: MONSTERS })
        play(on, [[hero, chain(GRUDGE)]])
        // The process ended with the round.
        expect(hero.statuses.has(DEMONIC)).toBe(false)
    })

    test("block gives a blue heart, rampart gives each ally one", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        const ally = unit(on, 4.2, 5, { team: HEROES })
        unit(on, 1, 1, { team: MONSTERS })
        const mine = heartsGiven(hero)
        const theirs = heartsGiven(ally)
        play(on, [[hero, chain(BLOCK)]])
        expect(mine).toEqual([BLUE_HEART])
        play(on, [[hero, chain(RAMPART)]])
        expect(theirs).toEqual([BLUE_HEART])
        expect(mine).toHaveLength(2)
    })

    test("explosive shell gives an explosive heart", () => {
        const on = battle()
        const hero = unit(on, 3.5, 5)
        unit(on, 1, 1, { team: MONSTERS })
        const hearts = heartsGiven(hero)
        play(on, [[hero, chain(EXPLOSIVE_SHELL)]])
        expect(hearts).toEqual([EXPLOSIVE_HEART])
    })
})
