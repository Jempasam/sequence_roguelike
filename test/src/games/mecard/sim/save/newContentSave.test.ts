import { describe, expect, test } from "vitest"
import { CARDS, ITEMS, LEGENDARY_CARDS, LOOT_CARDS, savedCard, STATUS_CODECS, USABLES, POTIONS } from "@game/core/mecard"
import { CARD_NAMES, ITEM_NAMES, USABLE_NAMES } from "@game/core/mecard"

// --- Tests ---

describe("what the catalogs give is written down by name", () => {
    test("every card of the loot and the legendary ones can be saved", () => {
        for(const card of [...LOOT_CARDS, ...LEGENDARY_CARDS]) expect(() => savedCard(card), card.name).not.toThrow()
    })

    test("every card is told apart by its name", () => {
        const names = CARDS.map(card => card.name)
        expect(new Set(names).size).toBe(names.length)
    })

    test("every item and usable is found back by its name", () => {
        for(const item of ITEMS) expect(ITEM_NAMES.has(item), item.name).toBe(true)
        for(const usable of USABLES) expect(USABLE_NAMES.has(usable), usable.name).toBe(true)
        void CARD_NAMES
    })

    test("every status type of a potion has a codec", () => {
        const types = new Set(STATUS_CODECS.map(codec => codec.type.name))
        expect(types.size).toBe(STATUS_CODECS.length)
        expect(POTIONS.length).toBeGreaterThan(0)
    })
})
