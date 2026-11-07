import { describe, expect, test } from "vitest"
import { BLACK_HOLE, DECOY, SENTINEL, SHOUT_TOTEM, TURRET } from "@game/core/mecard"
import type { Card, Unit } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../../../fixtures"

// --- Fixture builders ---

/** The bodies a card put in a battle, once its round is over. */
function summoned(on: ReturnType<typeof battle>): Unit[] {
    const bodies: Unit[] = []
    on.signals.spawned.add(({ unit: body }) => bodies.push(body))
    return bodies
}

/** A hero playing one card in front of a foe, and the bodies the card made. */
function playing(card: Card, foeAt: [number, number]) {
    const on = battle()
    const bodies = summoned(on)
    const hero = unit(on, 3.5, 6)
    const foe = unit(on, foeAt[0], foeAt[1], { team: MONSTERS })
    play(on, [[hero, chain(card)]])
    return { on, hero, foe, bodies }
}

// --- Tests ---

describe("summons playing a chain", () => {
    test("each stands a meter ahead of its owner", () => {
        for(const card of [BLACK_HOLE, TURRET, SHOUT_TOTEM, DECOY, SENTINEL]){
            const { bodies } = playing(card, [1, 1])
            expect(bodies).toHaveLength(1)
            expect(bodies[0].position.x).toBeCloseTo(3.5, 1)
            expect(bodies[0].position.y).toBeCloseTo(5, 1)
        }
    })

    test("black hole pulls the units around it", () => {
        const { foe, bodies } = playing(BLACK_HOLE, [3.5, 2.5])
        expect(foe.position.distance(bodies[0].position)).toBeLessThan(1.2)
    })

    test("turret aims then shoots the enemy in sight", () => {
        const { foe } = playing(TURRET, [3.5, 2.5])
        expect(foe.life).toBeLessThan(4)
    })

    test("decoy turns the unit around it to face it", () => {
        const { foe, bodies } = playing(DECOY, [4.5, 5])
        const toward = bodies[0].position.minus(foe.position).normalized
        expect(foe.direction.dot(toward!)).toBeGreaterThan(0.99)
    })

    test("the preview shows the spot, the zone, and what it would work on", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 4.5, 5, { team: MONSTERS })
        const [root] = chain(DECOY).preview(on, hero)
        expect(root.preview?.indicators.map(indicator => indicator.kind)).toEqual(["polygon", "polygon", "polygon"])
    })
})
