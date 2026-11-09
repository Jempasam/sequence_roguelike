import { describe, expect, test } from "vitest"
import { FIRE, PRAYER, REPEAT_2, REPETITION, SPELL, STEP, WAIT } from "@game/core/mecard"
import type { Battle, Unit } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../fixtures"
import { DamageType } from "@game/core/mecard"

/** A hero and a foe far from each other. */
function facing(): { on: Battle, hero: Unit, foe: Unit } {
    const on = battle()
    const hero = unit(on, 1, 5)
    const foe = unit(on, 6, 1, { team: MONSTERS })
    return { on, hero, foe }
}

// --- Tests ---

describe("Unit, the turns", () => {
    test("each tree read → told with its cards, in its turn", () => {
        const { on, hero } = facing()
        const told: string[] = []
        on.signals.cardActivated.add(({ unit, first, last, cards }) => {
            if(unit === hero) told.push(`${first}-${last} ${cards.join(" ")}`)
        })
        play(on, [[hero, chain(SPELL, FIRE, STEP)]])
        expect(told).toEqual([`0-1 ${SPELL} ${FIRE}`, `2-2 ${STEP}`])
    })

    test("a tree giving two actions → one each turn, the others playing between", () => {
        const { on, hero, foe } = facing()
        const order: string[] = []
        on.unitStepping.add(unit => order.push(unit === hero ? "hero" : "foe"))
        play(on, [[hero, chain(REPEAT_2, WAIT)], [foe, chain(WAIT, WAIT)]])
        expect(order).toEqual(["hero", "foe", "hero", "foe"])
    })

    test("a card that cannot be built → costs no turn", () => {
        const { on, hero, foe } = facing()
        const order: string[] = []
        const invalid: number[] = []
        on.unitStepping.add(unit => order.push(unit === hero ? "hero" : "foe"))
        on.signals.cardInvalid.add(({ index }) => invalid.push(index))
        play(on, [[hero, chain(SPELL, WAIT)], [foe, chain(WAIT)]])
        expect(order).toEqual(["hero", "foe"])
        expect(invalid).toEqual([0])
    })

    test("what cannot be built at the end of a chain → still told, with no pass of its own", () => {
        const { on, hero } = facing()
        const invalid: number[] = []
        let passes = 0
        on.signals.cardInvalid.add(({ index }) => invalid.push(index))
        on.passStarted.add(() => passes++)
        const plan = chain(WAIT, SPELL)
        hero.hand.push(...plan.cards)
        on.startRound()
        on.commit(hero, plan)
        on.endPreparation()
        on.playRound()
        expect(invalid).toEqual([1])
        expect(hero.chain.cursor).toBe(2)
        expect(passes).toBe(1)
    })

    test("what is left counts the steps ready and those of the chain", () => {
        const { on, hero } = facing()
        const plan = chain(REPEAT_2, WAIT, STEP)
        hero.hand.push(...plan.cards)
        on.startRound()
        on.commit(hero, plan)
        on.endPreparation()
        expect(hero.stepsLeft).toBe(3)
        on.tick()
        expect(hero.stepsLeft).toBe(2)
    })

    test("the reading moving on → the chain told, as a copy", () => {
        const { on, hero } = facing()
        const cursors: number[] = []
        hero.onChainChange.add(({ cursor }) => cursors.push(cursor))
        play(on, [[hero, chain(WAIT, WAIT)]])
        // Reset by the next round, then the chain given for this one, then each card read.
        expect(cursors.slice(0, 4)).toEqual([0, 0, 1, 2])
    })
})

describe("Unit, the preparation", () => {
    test("its preparations built → told, each activated, its chain rewritten", () => {
        const { on, hero } = facing()
        const prepared: Unit[] = []
        const activated: number[] = []
        on.unitPrepared.add(unit => prepared.push(unit))
        hero.onActivate.add(({ first }) => activated.push(first))
        const plan = chain(PRAYER, REPETITION, WAIT)
        hero.hand.push(...plan.cards)
        on.startRound()
        on.commit(hero, plan)
        on.endPreparation()
        expect(prepared).toContain(hero)
        expect(activated).toEqual([0, 0])
        expect(hero.chain.cards).toEqual([WAIT, WAIT])
    })
})

describe("Unit, its death", () => {
    test("killed → told with who did it, and what it had left is gone", () => {
        const { on, hero, foe } = facing()
        const sources: (Unit|null)[] = []
        hero.onDeath.add(({ source }) => sources.push(source))
        const plan = chain(WAIT, WAIT)
        hero.hand.push(...plan.cards)
        on.startRound()
        on.commit(hero, plan)
        on.endPreparation()
        hero.hearts.damage(hero.life, DamageType.PHYSICAL, foe)
        expect(sources).toEqual([foe])
        expect(hero.steps).toHaveLength(0)
    })
})
