import { describe, expect, test } from "vitest"
import { LaserLink } from "@game/core-src/games/mecard/sim/process/subs/Links"
import { BLOOD_FLASK } from "@game/core-src/games/mecard/sim/usable/subs/flask/AreaFlasks"
import type { Indicator } from "@game/core-src/games/mecard/sim/battle/preview/Preview"

import { battle, MONSTERS, unit } from "../fixtures"

// --- Fixture builders ---

/** The polygons among indicators. */
function polygons(indicators: readonly Indicator[]): Indicator[] {
    return indicators.filter(indicator => indicator.kind === "polygon")
}

// --- Tests ---

describe("Previewable, what a thing shows over the arena", () => {
    test("a laser link → the laser, and a mark over each enemy across it, nothing changed", () => {
        const on = battle()
        const hero = unit(on, 1, 3)
        const ally = unit(on, 5, 3)
        const enemy = unit(on, 3, 3, { team: MONSTERS })
        const life = enemy.life
        const preview = new LaserLink(ally, 1).preview?.({ battle: on, unit: hero, pose: hero })
        expect(polygons(preview?.indicators ?? [])).toHaveLength(2)
        expect(enemy.life).toBe(life)
    })

    test("a laser link, nobody across → only the laser", () => {
        const on = battle()
        const hero = unit(on, 1, 3)
        const ally = unit(on, 5, 3)
        const preview = new LaserLink(ally, 1).preview?.({ battle: on, unit: hero, pose: hero })
        expect(polygons(preview?.indicators ?? [])).toHaveLength(1)
    })

    test("a flask → its splash where it lands, and a mark over a unit it would reach, nothing changed", () => {
        const on = battle()
        const hero = unit(on, 3, 6)
        const enemy = unit(on, 3, 3, { team: MONSTERS })
        const preview = BLOOD_FLASK.preview?.({ battle: on, unit: hero, pose: hero })
        expect(polygons(preview?.indicators ?? [])).toHaveLength(2)
        expect(enemy.statuses.size).toBe(0)
    })
})
