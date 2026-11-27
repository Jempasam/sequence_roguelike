import { describe, expect, test } from "vitest"
import { SLASH } from "@game/core-src/games/mecard/sim/card/subs/attack/Slash"
import { THRUST } from "@game/core-src/games/mecard/sim/card/subs/attack/Thrust"
import { FIRE } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementCard"
import { SPELL } from "@game/core-src/games/mecard/sim/card/subs/spell/SpellCard"
import { ALL_BOOSTERS, boosterFit } from "@game/core-src/games/mecard/sim/catalog/boosters"

// --- Tests ---

describe("ALL_BOOSTERS", () => {
    test("each → named, with pools asking for cards they can give", () => {
        for(const booster of ALL_BOOSTERS){
            expect(booster.name).not.toBe("")
            expect(booster.pools.length).toBeGreaterThan(0)
            for(const { count, pool } of booster.pools){
                expect(count).toBeGreaterThan(0)
                expect(pool.length).toBeGreaterThan(0)
            }
        }
    })
})

describe("boosterFit", () => {
    const blades = ALL_BOOSTERS.find(booster => booster.name === "Lames")!
    const arcane = ALL_BOOSTERS.find(booster => booster.name === "Arcanes")!

    test("cards of its pools → a better fit than cards of another's", () => {
        expect(boosterFit(blades, [SLASH, THRUST])).toBeGreaterThan(boosterFit(blades, [FIRE]))
        expect(boosterFit(arcane, [SPELL, FIRE])).toBeGreaterThan(boosterFit(arcane, [THRUST]))
    })

    test("no cards → no fit", () => {
        expect(boosterFit(blades, [])).toBe(0)
    })
})
