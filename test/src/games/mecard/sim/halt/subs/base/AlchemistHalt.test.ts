import { describe, expect, test } from "vitest"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import { readsWhole } from "@game/core-src/games/mecard/sim/card/CardChain"
import { SLASH } from "@game/core-src/games/mecard/sim/card/subs/attack/Slash"
import { isFusion } from "@game/core-src/games/mecard/sim/card/subs/composite/FusionCard"
import { AIM } from "@game/core-src/games/mecard/sim/card/subs/movement/Aim"
import { FIRE } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementCard"
import { REACTION } from "@game/core-src/games/mecard/sim/card/subs/spell/ElementRewrites"
import { LOOT_CARDS } from "@game/core-src/games/mecard/sim/catalog/cards"
import { upgradesFor } from "@game/core-src/games/mecard/sim/catalog/upgrades"
import { upgradeOf } from "@game/core-src/games/mecard/sim/halt/subs/deck/AlchemistHalt"

// --- Tests ---

describe("upgradeOf", () => {
    test("a blow → a card made of it and an upgrade", () => {
        const upgrade = upgradeOf(SLASH, new Rng(1))
        expect(upgrade?.contents).toContain(SLASH)
        expect(upgrade?.contents?.length).toBeGreaterThanOrEqual(2)
    })

    test("an element → upgradable, a Réaction among the ways, and always kept in the result", () => {
        expect(upgradesFor(FIRE).some(held => held.chain[0] === REACTION)).toBe(true)
        for(let seed = 1; seed < 20; seed++){
            const upgrade = upgradeOf(FIRE, new Rng(seed))
            if(upgrade && isFusion(upgrade)) expect(upgrade.contents).toContain(FIRE)
        }
    })

    test("an aim → upgradable, as the catalog says; every upgrade of the loot reads whole", () => {
        expect(upgradesFor(AIM).length).toBeGreaterThan(0)
        expect(upgradeOf(AIM, new Rng(1))?.contents).toContain(AIM)
        for(const card of LOOT_CARDS){
            const upgrade = upgradeOf(card, new Rng(2))
            // An upgrade with a filter may wait for what the player puts after it: whole only then.
            const filtered = upgradesFor(card).some(held => held.filter)
            if(upgrade?.contents && !filtered) expect(readsWhole(upgrade.contents)).toBe(true)
        }
    })
})
