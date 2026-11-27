import { describe, expect, test } from "vitest"
import { plainText } from "@game/core-src/semantic/Text"
import { Rng } from "@game/core-src/games/mecard/sim/base/Rng"
import { shopGoods, SHOP_HALT } from "@game/core-src/games/mecard/sim/halt/subs/gift/ShopHalt"
import type { OfferDialog } from "@game/core-src/games/mecard/sim/travel/dialogs"

import { startedRun } from "../../../../../../fixtures/startedRun"

// --- Tests ---

describe("shopGoods", () => {
    test("any seed → cards, usables, an item and the removal, each with a price", () => {
        const goods = shopGoods(new Rng(4))
        expect(goods.map(good => good.kind)).toEqual(["card", "card", "card", "usable", "usable", "item", "removal"])
        for(const good of goods) expect(good.price).toBeGreaterThan(0)
    })
})

describe("ShopHalt", () => {
    test("the shop visited → each good shown with its own price, whatever its place in the offers", () => {
        const { travel } = startedRun(3)
        travel.visit(SHOP_HALT)
        const offer = travel.dialogs.at(-1) as OfferDialog
        expect(offer.offers).toHaveLength(7)
        const prices = offer.offers.map(shown => shown.price ?? 0)
        // The removal is the last: 30 gold, whatever its index.
        expect(prices[6]).toBe(30)
        for(const price of prices) expect(price).toBeGreaterThan(5)
    })

    test("the shop visited → the price is told apart, never written in the text of a good", () => {
        const { travel } = startedRun(3)
        travel.visit(SHOP_HALT)
        const offer = travel.dialogs.at(-1) as OfferDialog
        for(const shown of offer.offers) expect(plainText(shown.text ?? "")).not.toMatch(/^\d+ or/)
    })
})
