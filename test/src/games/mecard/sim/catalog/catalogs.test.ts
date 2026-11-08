import { describe, expect, test } from "vitest"
import {
    ALL_BOOSTERS, ALL_CARDS, ALL_FIGHTS, ALL_ITEMS, ALL_KITS, ALL_MONSTERS, ALL_PETS, ALL_UPGRADES, ALL_USABLES,
    BOSS_MONSTERS, LEGENDARY_CARDS, LOOT_BOOSTERS, LOOT_CARDS, LOOT_ITEMS, LOOT_KITS, LOOT_MONSTERS, LOOT_PETS,
    LOOT_UPGRADES, LOOT_USABLES, POTION_CARDS, STARTING_KITS,
} from "@game/core/mecard"

// --- Tests ---

describe("the catalogs follow one convention: ALL_Y, LOOT_Y, and X_Y for the parts", () => {
    const catalogs: [string, readonly unknown[], readonly unknown[]][] = [
        ["cards", ALL_CARDS, LOOT_CARDS],
        ["items", ALL_ITEMS, LOOT_ITEMS],
        ["usables", ALL_USABLES, LOOT_USABLES],
        ["monsters", ALL_MONSTERS, LOOT_MONSTERS],
        ["pets", ALL_PETS, LOOT_PETS],
        ["kits", ALL_KITS, LOOT_KITS],
        ["boosters", ALL_BOOSTERS, LOOT_BOOSTERS],
        ["upgrades", ALL_UPGRADES, LOOT_UPGRADES],
    ]

    test.each(catalogs)("%s → ALL_ holds each once, LOOT_ holds only some of them", (_name, all, loot) => {
        expect(new Set(all).size).toBe(all.length)
        expect(new Set(loot).size).toBe(loot.length)
        for(const each of loot) expect(all).toContain(each)
    })

    test("the parts of a catalog are all in it", () => {
        const parts: [readonly unknown[], readonly unknown[]][] = [
            [LEGENDARY_CARDS, ALL_CARDS], [POTION_CARDS, ALL_CARDS], [STARTING_KITS, ALL_KITS],
            [BOSS_MONSTERS, ALL_MONSTERS], [ALL_FIGHTS, ALL_FIGHTS],
        ]
        for(const [part, all] of parts) for(const each of part) expect(all).toContain(each)
    })

    test("the legendary cards are in the whole catalog, but not in the loot", () => {
        for(const card of LEGENDARY_CARDS){
            expect(ALL_CARDS).toContain(card)
            expect(LOOT_CARDS).not.toContain(card)
        }
    })

    test("the bosses are not in the loot of monsters", () => {
        for(const boss of BOSS_MONSTERS) expect(LOOT_MONSTERS).not.toContain(boss)
    })
})
