import { describe, expect, test } from "vitest"
import { BOOSTERS, openBooster, Rng } from "@game/core/mecard"

// --- Tests ---

describe("openBooster", () => {
    test("any seed → as many cards as the pools ask, each from its pool", () => {
        for(const booster of BOOSTERS){
            const count = booster.pools.reduce((sum, pool) => sum + pool.count, 0)
            for(let seed = 1; seed < 20; seed++){
                const cards = openBooster(new Rng(seed), booster)
                expect(cards).toHaveLength(count)
                let at = 0
                for(const { count: asked, pool } of booster.pools){
                    for(const card of cards.slice(at, at + asked)) expect(pool).toContain(card)
                    at += asked
                }
            }
        }
    })
})
