import { describe, expect, test } from "vitest"
import {
    BARRELS, BOULDERS, BURNING_GROUNDS, CARDS, Codecs, COATED, COATS, FIRE_ELEMENT, GRAND_RITUALS, ITEMS,
    LEGENDARY_CARDS, LOOT_CARDS, POISON_POTION, POTIONS, PUDDLES, savedCard, STATUS_CODECS, STATUS_TYPES,
    USABLES, WATER_ELEMENT, WAVES, WHIRLWINDS, WIND_ELEMENT,
} from "@game/core/mecard"
import { CARD_CODECS, ITEM_NAMES, USABLE_NAMES } from "@game/core/mecard"

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
    })

    test("every card of the catalog is written down, then found back as itself", () => {
        for(const card of CARDS) expect(CARD_CODECS.load(CARD_CODECS.save(card)), card.name).toBe(card)
    })

    test("a card of a kind no codec writes → refused, naming the card", () => {
        expect(() => CARD_CODECS.save({ ...CARDS[0], name: "Impostor" })).toThrow(/not a card that can be saved/)
    })

    test("a text of no codec → refused as a save of another version", () => {
        expect(() => CARD_CODECS.load("nothing:here")).toThrow(/another version/)
        expect(() => CARD_CODECS.load("no prefix")).toThrow(/another version/)
    })

    test("every kind of status alone in its kind is written down, then found back as itself", () => {
        for(const type of STATUS_TYPES){
            expect(STATUS_CODECS.load(STATUS_CODECS.save(type)), type.name).toBe(type)
        }
        expect(POTIONS.length).toBeGreaterThan(0)
    })

    test("a variant made for a dose or an element → made once, found back as itself", () => {
        const dose = { potion: POISON_POTION, sign: -1, factor: 2 } as const
        expect(COATS.of(dose)).toBe(COATS.of({ ...dose }))
        expect(COATS.of(dose)).not.toBe(COATS.of({ ...dose, sign: 1 }))
        for(const type of [
            COATS.of(dose), BARRELS.of(dose), PUDDLES.of(dose), GRAND_RITUALS.of(FIRE_ELEMENT),
            BURNING_GROUNDS.of(FIRE_ELEMENT), BOULDERS.of(WATER_ELEMENT), WAVES.of(WATER_ELEMENT),
            WHIRLWINDS.of(WIND_ELEMENT),
        ]){
            expect(STATUS_CODECS.load(STATUS_CODECS.save(type)), type.name).toBe(type)
        }
    })

    test("a status made of a variant → its kind, its dose, its level", () => {
        const dose = { potion: POISON_POTION, sign: 1, factor: 1 } as const
        const status = COATS.of(dose).make(3, COATS.of(dose))
        expect(status.level).toBe(3)
        expect(status.type.family).toBe(COATED)
        expect(String(status)).toContain("poison")
    })

    test("two codecs of one prefix → refused", () => {
        const codec = { prefix: "same", is: () => false, serialize: () => "", parse: () => 0 }
        expect(() => new Codecs<number>("number", [codec, codec])).toThrow(/same/)
    })
})
