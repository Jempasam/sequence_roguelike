import { describe, expect, test } from "vitest"
import { Codecs } from "@game/core-src/games/mecard/sim/base/Codec"
import { ALL_CARDS, LEGENDARY_CARDS, LOOT_CARDS } from "@game/core-src/games/mecard/sim/catalog/cards"
import { ALL_ITEMS } from "@game/core-src/games/mecard/sim/catalog/items"
import { ALL_USABLES } from "@game/core-src/games/mecard/sim/catalog/usables"
import { FIRE_ELEMENT } from "@game/core-src/games/mecard/sim/element/subs/Fire"
import { WATER_ELEMENT } from "@game/core-src/games/mecard/sim/element/subs/Water"
import { WIND_ELEMENT } from "@game/core-src/games/mecard/sim/element/subs/Wind"
import { BURNING_GROUNDS } from "@game/core-src/games/mecard/sim/hazard/subs/BurningGround"
import { PUDDLES } from "@game/core-src/games/mecard/sim/hazard/subs/Puddle"
import { BOULDERS } from "@game/core-src/games/mecard/sim/hazard/subs/Rocky"
import { WAVES } from "@game/core-src/games/mecard/sim/hazard/subs/Surging"
import { WHIRLWINDS } from "@game/core-src/games/mecard/sim/hazard/subs/Whirling"
import { POISON_POTION, POTIONS } from "@game/core-src/games/mecard/sim/potion/subs/potions"
import { savedCard } from "@game/core-src/games/mecard/sim/save/battleSave"
import { STATUS_CODECS } from "@game/core-src/games/mecard/sim/save/statusCodecs"
import { STATUS_TYPES } from "@game/core-src/games/mecard/sim/status/statusTypes"
import { COATED, COATS } from "@game/core-src/games/mecard/sim/status/subs/Coated"
import { RITUAL_STATUSES } from "@game/core-src/games/mecard/sim/status/subs/RitualStatus"
import { BARRELS } from "@game/core-src/games/mecard/sim/status/subs/Splashing"
import { CARD_CODECS, ITEM_NAMES, USABLE_NAMES } from "@game/core-src/games/mecard/sim/save/catalogNames"

// --- Tests ---

describe("what the catalogs give is written down by name", () => {
    test("every card of the loot and the legendary ones can be saved", () => {
        for(const card of ALL_CARDS) expect(() => savedCard(card), card.name).not.toThrow()
        for(const card of [...LOOT_CARDS, ...LEGENDARY_CARDS]) expect(ALL_CARDS).toContain(card)
    })

    test("every card is told apart by its name", () => {
        const names = ALL_CARDS.map(card => card.name)
        expect(new Set(names).size).toBe(names.length)
    })

    test("every item and usable is found back by its name", () => {
        for(const item of ALL_ITEMS) expect(ITEM_NAMES.has(item), item.name).toBe(true)
        for(const usable of ALL_USABLES) expect(USABLE_NAMES.has(usable), usable.name).toBe(true)
    })

    test("every card of the catalog is written down, then found back as itself", () => {
        for(const card of ALL_CARDS) expect(CARD_CODECS.load(CARD_CODECS.save(card)), card.name).toBe(card)
    })

    test("a card of a kind no codec writes → refused, naming the card", () => {
        expect(() => CARD_CODECS.save({ ...ALL_CARDS[0], name: "Impostor", variants: () => new Map() })).toThrow(/not a card that can be saved/)
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
            COATS.of(dose), BARRELS.of(dose), PUDDLES.of(dose), RITUAL_STATUSES.of(FIRE_ELEMENT),
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
