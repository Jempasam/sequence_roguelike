import { describe, expect, test } from "vitest"
import { Choice, Color, NineSlice } from "@game/core"
import { heroOf, KITS } from "@game/core/mecard"
import { cardsOption, unitHead } from "@game/core/mecard/choice-options"

import { uiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** The room kept around an option for the frame of the one picked, as a halt keeps it. */
const PICKED_WIDTH = 2

/** Offers every kit in a choice of a width, as a tavern does, and plays a second of its wobble. */
function wobbleOffer(width: number): void {
    const setup = uiSetup({ debug: true }, width, 270)
    const sprites = { of: () => null } as unknown as Parameters<typeof unitHead>[2]
    const options = KITS.map(kit => {
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

// --- Tests ---

describe("cardsOption", () => {
    test.each([1000, 324, 200])("kits offered in a choice %i wide → each fits, posed, and nothing is cut", width => {
        expect(() => wobbleOffer(width)).not.toThrow()
    })
})
