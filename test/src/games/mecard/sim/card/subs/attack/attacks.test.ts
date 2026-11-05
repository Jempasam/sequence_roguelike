import { describe, expect, test } from "vitest"
import { Arena, Battle, DAGGER, Heart, RED_HEART, RICOCHET, SHOTGUN, Vector2 } from "@game/core/mecard"

import { battle, chain, MONSTERS, play, unit } from "../../../fixtures"

/** Hearts enough to count every half lost. */
function sturdy(): Heart[] {
    return Heart.many(RED_HEART, 12)
}

// --- Tests ---

describe("DAGGER", () => {
    test("a unit facing the stabber → the damage of a blow", () => {
        const on = battle()
        const stabber = unit(on, 3, 4)
        const target = unit(on, 3, 3, { team: MONSTERS, hearts: sturdy(), direction: Vector2.DOWN })
        play(on, [[stabber, chain(DAGGER)]])
        expect(12 - target.life).toBe(2)
    })

    test("a unit turning its back → twice the damage", () => {
        const on = battle()
        const stabber = unit(on, 3, 4)
        const target = unit(on, 3, 3, { team: MONSTERS, hearts: sturdy(), direction: Vector2.UP })
        play(on, [[stabber, chain(DAGGER)]])
        expect(12 - target.life).toBe(4)
    })

    test("strength of the unit → added before the stab is doubled", () => {
        const on = battle()
        const stabber = unit(on, 3, 4)
        stabber.stats.strength.base = 1
        const target = unit(on, 3, 3, { team: MONSTERS, hearts: sturdy(), direction: Vector2.UP })
        play(on, [[stabber, chain(DAGGER)]])
        expect(12 - target.life).toBe(6)
    })
})

describe("SHOTGUN", () => {
    test("the same seed → the same pellets, the same wounds", () => {
        const lost = (seed: number): number => {
            const on = new Battle(new Arena(7, 7), seed)
            const shooter = unit(on, 3, 5)
            const target = unit(on, 3, 3.6, { team: MONSTERS, hearts: sturdy() })
            play(on, [[shooter, chain(SHOTGUN)]])
            return 12 - target.life
        }
        expect(lost(3)).toBe(lost(3))
    })

    test("a unit right ahead → hit by every pellet, whatever the draw", () => {
        const on = battle()
        const shooter = unit(on, 3, 5)
        const target = unit(on, 3, 4.3, { team: MONSTERS, hearts: sturdy() })
        play(on, [[shooter, chain(SHOTGUN)]])
        expect(12 - target.life).toBe(3)
    })

    test("its preview → the sector the pellets may go in", () => {
        const on = battle()
        const shooter = unit(on, 3, 5)
        const [root] = chain(SHOTGUN).preview(on, shooter, false)
        expect(root.preview?.indicators.map(indicator => indicator.kind)).toEqual(["polygon"])
    })
})

describe("RICOCHET", () => {
    test("a unit around the corner of a wall → hit after the bounce", () => {
        const on = battle()
        const shooter = unit(on, 2, 2, { direction: new Vector2(1, -1).normalized ?? Vector2.UP })
        // Up and right, it meets the top wall at (4, 0), and comes back down and right through (5,5, 1,5).
        const target = unit(on, 5.5, 1.5, { team: MONSTERS, hearts: sturdy() })
        play(on, [[shooter, chain(RICOCHET)]])
        expect(12 - target.life).toBe(1)
    })

    test("its preview → the line, then the bounce", () => {
        const on = battle()
        const shooter = unit(on, 3.5, 1)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        const [root] = chain(RICOCHET).preview(on, shooter, false)
        expect(root.preview?.indicators).toHaveLength(2)
    })
})
