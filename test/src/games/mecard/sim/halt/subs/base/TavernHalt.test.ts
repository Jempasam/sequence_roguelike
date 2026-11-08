import { describe, expect, test } from "vitest"
import { ALL_KITS, Rng, Run, tavernKits } from "@game/core/mecard"

// --- Tests ---

describe("tavernKits", () => {
    test("the starting party → only kits not in it", () => {
        const run = new Run(1)
        const kits = tavernKits(new Rng(1), run.heroes)
        expect(kits).toHaveLength(3)
        for(const kit of kits) expect(run.heroes.map(hero => hero.name)).not.toContain(kit.name)
        expect(ALL_KITS.length).toBeGreaterThanOrEqual(run.heroes.length + 3)
    })
})
