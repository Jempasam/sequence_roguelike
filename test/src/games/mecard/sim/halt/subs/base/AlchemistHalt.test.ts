import { describe, expect, test } from "vitest"
import {
    AIM, FIRE, isFusion, LOOT_CARDS, readsWhole, Rng, SLASH, SPELL, upgradeOf, upgradesFor,
} from "@game/core/mecard"

// --- Tests ---

describe("upgradeOf", () => {
    test("a blow → a card made of it and an upgrade", () => {
        const upgrade = upgradeOf(SLASH, new Rng(1))
        expect(upgrade?.contents).toContain(SLASH)
        expect(upgrade?.contents?.length).toBe(2)
    })

    test("an element → no card is made of nothing: it still takes its spell in front", () => {
        for(let seed = 1; seed < 20; seed++){
            const upgrade = upgradeOf(FIRE, new Rng(seed))
            if(upgrade && isFusion(upgrade)) expect(upgrade.contents).toEqual([SPELL, FIRE])
        }
    })

    test("an aim → upgradable, as the catalog says; every upgrade of the loot reads whole", () => {
        expect(upgradesFor(AIM).length).toBeGreaterThan(0)
        expect(upgradeOf(AIM, new Rng(1))?.contents).toContain(AIM)
        for(const card of LOOT_CARDS){
            const upgrade = upgradeOf(card, new Rng(2))
            if(upgrade?.contents) expect(readsWhole(upgrade.contents)).toBe(true)
        }
    })
})
