import { describe, expect, test } from "vitest"
import {
    Arena, Battle, CardChain, DIVISION, DRIZZLE, FLEE, Heart, LOOT_CARDS, MEGA_LASER,
    MONSTERS as KINDS,
    PURSUIT, RED_HEART, RETREAT_SHOT, SHADOW_AIM, SHADOW_STEP, SHADOW_WAY, SHIELD_HEART, SIDESTEP,
    SLOWED, SPARK, SPIT,
    STEP, Vector2,
} from "@game/core/mecard"
import type { Card, Unit } from "@game/core/mecard"

import { battle, chain, expectAt, MONSTERS, play, unit, withPillars } from "../../fixtures"

// --- Fixture builders ---

/** A unit with a number of full red hearts. */
function hearts(count: number): Heart[] {
    return Heart.many(RED_HEART, count)
}

/** The perfect clone of a unit in a battle, none when it has none. */
function cloneOf(on: Battle, maker: Unit): Unit|undefined {
    return on.units.find(each => each.owner === maker)
}

// --- Tests ---

describe("clone", () => {
    test("room ahead → appears ahead of its maker", () => {
        const on = battle()
        const maker = unit(on, 3, 3)
        expectAt(on.clone(maker, hearts(2)) as Unit, 3, 2.2)
    })

    test("something ahead → appears to the side, never behind", () => {
        const on = battle()
        const maker = unit(on, 3, 3)
        unit(on, 3, 2.2, { team: MONSTERS })
        const clone = on.clone(maker, hearts(2)) as Unit
        expect(clone.position.y).toBeLessThanOrEqual(3)
    })
})

describe("SIDESTEP", () => {
    test("played → one meter to a side, facing the same way", () => {
        const on = battle()
        const stepper = unit(on, 3, 3)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[stepper, chain(SIDESTEP)]])
        expect(Math.abs(stepper.position.x - 3)).toBeCloseTo(1)
        expect(stepper.position.y).toBeCloseTo(3)
        expect(stepper.direction).toEqual(Vector2.UP)
    })
})

describe("FLEE", () => {
    test("an enemy close → one meter away from it, facing the same way", () => {
        const on = battle()
        const fleeing = unit(on, 3, 3)
        unit(on, 3, 2, { team: MONSTERS })
        play(on, [[fleeing, chain(FLEE)]])
        expectAt(fleeing, 3, 4)
        expect(fleeing.direction).toEqual(Vector2.UP)
    })

    test("nobody close → stays", () => {
        const on = battle()
        const fleeing = unit(on, 3, 3)
        unit(on, 3, 0.5, { team: MONSTERS })
        play(on, [[fleeing, chain(FLEE)]])
        expectAt(fleeing, 3, 3)
    })
})

describe("SHADOW_AIM", () => {
    test("an enemy closer through a wall → turns to that wall, and the shadow step comes out near it", () => {
        const on = battle()
        const aiming = unit(on, 0.5, 3.5)
        unit(on, 5, 3.5, { team: MONSTERS })
        play(on, [[aiming, chain(SHADOW_AIM, SHADOW_STEP)]])
        expect(aiming.direction.x).toBeLessThan(0)
        expect(aiming.position.x).toBeGreaterThan(5)
    })

    test("previewed → a reach around the unit, and one beyond each wall", () => {
        const on = battle()
        const aiming = unit(on, 3, 3)
        unit(on, 3, 2, { team: MONSTERS })
        const { indicators } = SHADOW_AIM.action.preview({ battle: on, unit: aiming, pose: aiming })
        expect(indicators.filter(each => each.kind === "polygon")).toHaveLength(5)
    })

    test("the loot → holds its fusion, not the card alone", () => {
        expect(LOOT_CARDS).toContain(SHADOW_WAY)
        expect(LOOT_CARDS).not.toContain(SHADOW_AIM)
    })
})

describe("MEGA_LASER", () => {
    test("a pillar on its way → goes through, a meter wide, and no wider", () => {
        const on = withPillars(new Battle(new Arena(7, 7), 1), { center: new Vector2(3.5, 2), radius: 0.5 })
        const shooter = unit(on, 3.5, 5)
        const edge = unit(on, 4.2, 1, { team: MONSTERS })
        const behind = unit(on, 3.5, 0.5, { team: MONSTERS })
        const aside = unit(on, 4.6, 1, { team: MONSTERS })
        play(on, [[shooter, chain(MEGA_LASER)]])
        expect(edge.life).toBe(3)
        expect(behind.life).toBe(3)
        expect(aside.life).toBe(4)
    })
})

describe("SPIT", () => {
    test("a unit ahead → slowed, with no wound", () => {
        const on = battle()
        const spitter = unit(on, 3, 5)
        const hit = unit(on, 3, 3, { team: MONSTERS })
        play(on, [[spitter, chain(SPIT)]])
        expect(hit.statuses.has(SLOWED)).toBe(true)
        expect(hit.life).toBe(4)
    })
})

describe("DIVISION", () => {
    test("five hearts → a clone on two shields, and nothing lost", () => {
        const on = battle()
        const maker = unit(on, 3, 5, { hearts: hearts(5) })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[maker, chain(DIVISION)]])
        const clone = cloneOf(on, maker) as Unit
        expect(clone.hearts.all.map(heart => heart.kind)).toEqual([SHIELD_HEART, SHIELD_HEART])
        expect(clone.controller).toBe("bot")
        expect(maker.life).toBe(5)
    })

    test("one heart → no clone", () => {
        const on = battle()
        const maker = unit(on, 3, 5, { hearts: hearts(1) })
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[maker, chain(DIVISION)]])
        expect(cloneOf(on, maker)).toBeUndefined()
    })

    test("a clone → the rest of the chain, the same stats and statuses, right after its maker for good", () => {
        const on = battle()
        const maker = unit(on, 3, 5)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        maker.stats.strength.base = 2
        on.applyStatus(maker, SLOWED, 3)
        play(on, [[maker, chain(DIVISION, STEP)]])
        const clone = cloneOf(on, maker) as Unit
        // Slowed as its maker, it walks half a step from where it came, 0.8 ahead of it.
        expect(clone.position.y).toBeCloseTo(3.2)
        expect(clone.stats.strength.base).toBe(2)
        expect([...clone.statuses.keys()]).toEqual([...maker.statuses.keys()])
        expect(clone.alive).toBe(true)
        expect(on.initiative.indexOf(clone)).toBe(on.initiative.indexOf(maker) + 1)
    })
})

describe("named fusions", () => {
    test.each<[string, Card, number]>([
        ["Poursuite", PURSUIT, 4], ["Étincelle", SPARK, 1], ["Bruine", DRIZZLE, 1], ["Tir de repli", RETREAT_SHOT, 3],
        ["Voie de l'ombre", SHADOW_WAY, 2],
    ])("%s → plays all of its cards", (name, fusion, steps) => {
        const on = battle()
        const player = unit(on, 3, 5)
        expect(fusion.name).toBe(name)
        const resolved = new CardChain([fusion]).resolve(
            { pick: options => options[0] }, [], { battle: on, unit: player },
        )
        expect(resolved.chain.actionsLeft()).toHaveLength(steps)
    })
})

describe("monster loops", () => {
    test("every round of every monster → read whole by a bot", () => {
        for(const kind of KINDS){
            expect(kind.cards.length % kind.draw, kind.name).toBe(0)
            for(let at = 0; at < kind.cards.length; at += kind.draw){
                const hand = kind.cards.slice(at, at + kind.draw)
                expect(CardChain.leftToRight(hand, kind.draw).cards, kind.name).toEqual(hand)
            }
        }
    })
})
