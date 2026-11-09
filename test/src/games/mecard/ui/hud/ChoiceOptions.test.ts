import { describe, expect, test } from "vitest"
import { Choice, Color, NineSlice } from "@game/core"
import { heroOf, ALL_KITS, LOOT_MONSTERS, monsterBooster } from "@game/core/mecard"
import { boosterView } from "@game/core/mecard/booster-view"
import { CARD_OVERLAP, cardsOption, unitHead } from "@game/core/mecard/choice-options"

import { uiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** The room kept around an option for the frame of the one picked, as a halt keeps it. */
const PICKED_WIDTH = 2

/** Offers every kit in a choice of a width, as a tavern does, and plays a second of its wobble. */
function wobbleOffer(width: number): void {
    const setup = uiSetup({ debug: true }, width, 270)
    const sprites = { of: () => null } as unknown as Parameters<typeof unitHead>[2]
    const options = ALL_KITS.map(kit => {
        const head = unitHead(setup.theme, heroOf(kit), sprites)
        return cardsOption(setup.theme, [...new Set(kit.cards)], kit.name, { head })
    })
    const frame = NineSlice.flat(setup.theme.white, new Color(1, 1, 1))
    const choice = new Choice(setup.theme, () => ({ title: null, options }), () => {}, {
        gap: 6, spacing: 8, picked: { frame, width: PICKED_WIDTH },
    })
    setup.main.content.add(choice, { x: "stretch", y: "end" })
    for(let tick = 0; tick < 60; tick++){
        setup.ui.update(1 / 60)
        setup.ui.render()
    }
}

/** Offers every booster a dark magician may offer, posed in a choice, and plays a second of its wobble. */
function boosterOffer(): void {
    const setup = uiSetup({ debug: true }, 1000, 270)
    const options = LOOT_MONSTERS.map(monster => {
        const booster = monsterBooster(monster)
        return cardsOption(setup.theme, [], null, { before: [boosterView(setup.theme, booster, null)] })
    })
    const frame = NineSlice.flat(setup.theme.white, new Color(1, 1, 1))
    const choice = new Choice(setup.theme, () => ({ title: null, options }), () => {}, {
        gap: 6, spacing: 8, picked: { frame, width: PICKED_WIDTH },
    })
    setup.main.content.add(choice, { x: "stretch", y: "end" })
    for(let tick = 0; tick < 60; tick++){
        setup.ui.update(1 / 60)
        setup.ui.render()
    }
}

// --- Tests ---

/** The width of an option of a kit, its cards overlapped or not, in a choice of a width. */
function optionWidth(count: number, overlapped: boolean, width: number): number {
    const setup = uiSetup({}, width, 270)
    const [kit] = ALL_KITS
    const cards = [...new Set(kit.cards)].slice(0, count)
    const option = cardsOption(setup.theme, cards, null, { overlapped })
    return option.measure(Infinity).preferredWidth
}

describe("cardsOption", () => {
    test("overlapped cards → a third of a card each over the next, whatever the room", () => {
        const [kit] = ALL_KITS
        const count = Math.min(5, new Set(kit.cards).size)
        expect(count).toBeGreaterThan(2)
        const apart = optionWidth(count, false, 1000)
        const overlapped = optionWidth(count, true, 1000)
        expect(overlapped).toBeLessThan(apart)
        expect(apart - overlapped).toBeGreaterThanOrEqual((count - 1) * (CARD_OVERLAP - 2) - 1)
        expect(optionWidth(count, true, 100)).toBe(overlapped)
    })

    test.each([1000, 324, 200])("kits offered in a choice %i wide → each fits, posed, and nothing is cut", width => {
        expect(() => wobbleOffer(width)).not.toThrow()
    })

    test("a booster of a monster, its icon a card holding cards → it fits, posed, and nothing is cut", () => {
        expect(() => boosterOffer()).not.toThrow()
    })
})
