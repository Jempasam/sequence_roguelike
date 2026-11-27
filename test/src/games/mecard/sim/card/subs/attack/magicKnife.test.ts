import { describe, expect, test } from "vitest"
import { MAGIC_KNIFE } from "@game/core-src/games/mecard/sim/card/subs/attack/MagicKnife"

import { battle, chain, MONSTERS, play, unit } from "../../../fixtures"

// --- Tests ---

describe("magic knife", () => {
    test("it wounds the units on its way, going through them", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const near = unit(on, 3.5, 4.5, { team: MONSTERS })
        const far = unit(on, 3.5, 3, { team: MONSTERS })
        play(on, [[hero, chain(MAGIC_KNIFE)]])
        expect(near.life).toBeLessThan(4)
        expect(far.life).toBeLessThan(4)
    })

    test("it comes back at the end of the round, wounding the units it passes again", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        const foe = unit(on, 3.5, 4.5, { team: MONSTERS })
        // A second foe, far from the way, so the battle goes on to the end of the round.
        unit(on, 0.5, 0.5, { team: MONSTERS })
        play(on, [[hero, chain(MAGIC_KNIFE)]])
        // Wounded going, and wounded coming back: two hearts for a foe of the way.
        expect(foe.life).toBeLessThanOrEqual(2)
    })

    test("the knife is gone once back", () => {
        const on = battle()
        const hero = unit(on, 3.5, 6)
        unit(on, 0.5, 0.5, { team: MONSTERS })
        const knives: string[] = []
        on.signals.spawned.add(({ unit: body }) => knives.push(body.name))
        play(on, [[hero, chain(MAGIC_KNIFE)]])
        expect(knives).toEqual(["Couteau de lancer"])
        expect(on.units.some(other => other.name === "Couteau de lancer")).toBe(false)
    })
})
