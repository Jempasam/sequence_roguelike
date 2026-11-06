import { describe, expect, test } from "vitest"
import { Rng, shopGoods } from "@game/core/mecard"

// --- Tests ---

describe("shopGoods", () => {
    test("any seed → cards, usables, an item and the removal, each with a price", () => {
        const goods = shopGoods(new Rng(4))
        expect(goods.map(good => good.kind)).toEqual(["card", "card", "card", "usable", "usable", "item", "removal"])
        for(const good of goods) expect(good.price).toBeGreaterThan(0)
    })
})
