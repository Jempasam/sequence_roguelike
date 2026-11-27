import { describe, expect, test } from "vitest"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import { ALL_KITS } from "@game/core-src/games/mecard/sim/catalog/kits"
import { tavernKits } from "@game/core-src/games/mecard/sim/halt/subs/gift/TavernHalt"
import { Run } from "@game/core-src/games/mecard/sim/run/Run"

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
