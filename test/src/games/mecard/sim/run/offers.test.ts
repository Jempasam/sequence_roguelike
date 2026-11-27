import { describe, expect, test } from "vitest"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import { readsWhole } from "@game/core-src/games/mecard/sim/card/CardChain"
import { inventedFusion } from "@game/core-src/games/mecard/sim/run/offers"

// --- Tests ---

describe("inventedFusion", () => {
    test("any seed → two cards at least, reading whole", () => {
        for(let seed = 1; seed < 40; seed++){
            const fusion = inventedFusion(new Rng(seed))
            expect(fusion.contents?.length).toBeGreaterThanOrEqual(2)
            expect(readsWhole(fusion.contents ?? [])).toBe(true)
        }
    })
})
