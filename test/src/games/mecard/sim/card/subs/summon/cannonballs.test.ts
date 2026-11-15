import { describe, expect, test } from "vitest"
import { BOUNCING_BALL, CANNONBALL } from "@game/core/mecard"
import type { Card, Unit } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../../../fixtures"

// --- Fixture builders ---

/** The bodies a card put in a battle. */
function summoned(on: ReturnType<typeof battle>): Unit[] {
    const bodies: Unit[] = []
    on.signals.spawned.add(({ unit: body }) => bodies.push(body))
    return bodies
}

/** A hero playing one card, a foe straight ahead of the body it sets down, and the bodies the card made. */
function playing(card: Card, foeAt: [number, number]) {
    const on = battle()
    const bodies = summoned(on)
    const hero = unit(on, 3.5, 6)
    const foe = unit(on, foeAt[0], foeAt[1], { team: MONSTERS })
    play(on, [[hero, chain(card)]])
    return { on, hero, foe, bodies }
}

// --- Tests ---

describe("cannonballs", () => {
    test("each stands a meter ahead of its owner", () => {
        for(const card of [CANNONBALL, BOUNCING_BALL]){
            const { bodies } = playing(card, [3.5, 1])
            expect(bodies).toHaveLength(1)
            expect(bodies[0].position.y).toBeLessThan(6)
        }
    })

    test("the cannonball rams the enemy in front of it", () => {
        const { foe } = playing(CANNONBALL, [3.5, 3])
        expect(foe.life).toBeLessThan(4)
    })

    test("the cannonball is gone at the end of its round", () => {
        const { bodies } = playing(CANNONBALL, [0.5, 0.5])
        expect(bodies[0].alive).toBe(false)
    })

    test("the bouncing ball blows up and is gone at the end of its round", () => {
        const { bodies } = playing(BOUNCING_BALL, [0.5, 0.5])
        expect(bodies[0].alive).toBe(false)
    })

    test("the bouncing ball blows up what is next to it", () => {
        const { foe } = playing(BOUNCING_BALL, [3.5, 4.2])
        expect(foe.life).toBeLessThan(4)
    })
})
