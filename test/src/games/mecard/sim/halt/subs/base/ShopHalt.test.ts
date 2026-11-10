import { describe, expect, test } from "vitest"
import { plainText } from "@game/core"
import { Rng, shopGoods, SHOP_HALT } from "@game/core/mecard"
import type { OfferDialog } from "@game/core/mecard"

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
        const texts = offer.offers.map(shown => plainText(shown.text ?? ""))
        expect(texts).toHaveLength(7)
        const prices = texts.map(text => Number(/^(\d+) or/.exec(text)?.[1]))
        // The removal is the last: 30 gold, whatever its index.
        expect(prices[6]).toBe(30)
        for(const price of prices) expect(price).toBeGreaterThan(5)
    })
})
