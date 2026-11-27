import { describe, expect, test } from "vitest"
import { Sprite } from "@game/core-src/engine/gpu/Sprite"
import { Scroll } from "@game/core-src/engine/ui/layout/Scroll"
import { NineSlice } from "@game/core-src/engine/ui/NineSlice"
import { Panel } from "@game/core-src/engine/ui/widget/Panel"

import { uiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A frame whose margins are drawn 16 pixels thick on each side. */
function frame(): { setup: ReturnType<typeof uiSetup>, nine: NineSlice } {
    const setup = uiSetup()
    const sprite = new Sprite(setup.theme.white.texture, 100, 8, 48, 48)
    const nine = new NineSlice(sprite, { left: 16, top: 16, right: 16, bottom: 16 }, {
        border: { left: 16, top: 16, right: 16, bottom: 16 },
    })
    return { setup, nine }
}

// --- Tests ---

describe("Panel", () => {
    test("squeezable → down to the margins of its frame, whatever its content asks", () => {
        const { setup, nine } = frame()
        const panel = new Panel(setup.theme, { background: nine, padding: 7, squeezable: true })
        panel.content = new Scroll(setup.theme, { width: 10, height: 50 })
        const hint = panel.measure(Infinity)
        expect(hint.minHeight).toBe(32)
        expect(hint.preferredHeight).toBe(64)
    })

    test("squeezable, its content small → never lower than the margins of its frame", () => {
        const { setup, nine } = frame()
        const panel = new Panel(setup.theme, { background: nine, padding: 7, squeezable: true })
        panel.content = new Scroll(setup.theme, { width: 10, height: 4 })
        const hint = panel.measure(Infinity)
        expect(hint.minHeight).toBe(32)
        expect(hint.preferredHeight).toBe(32)
    })

    test("not squeezable → the minimum of its content and its padding", () => {
        const { setup, nine } = frame()
        const panel = new Panel(setup.theme, { background: nine, padding: 7 })
        panel.content = new Scroll(setup.theme, { width: 10, height: 50 })
        expect(panel.measure(Infinity).minHeight).toBe(14)
    })
})
