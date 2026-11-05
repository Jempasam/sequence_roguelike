import { describe, expect, test } from "vitest"
import { Bubble, Color, Label, Paragraph } from "@game/core"

import { ADVANCE, LINE, Probe, uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** The room a bubble of the default look keeps around its content: its point, its edge, its padding. */
function roomOf(setup: UiSetup): number {
    return 6 + 2 + 1 + setup.theme.panel.padding
}

/** A bubble around a probe of 40 by 20, at the top left of the main layer, laid out. */
function shownBubble(setup: UiSetup): Bubble {
    const bubble = new Bubble(setup.theme)
    bubble.content = new Probe("said", [40, 20])
    setup.main.content.add(bubble, { x: "start", y: "start" })
    setup.ui.render()
    return bubble
}

/** The color of an outline. */
const BLACK = new Color(0, 0, 0)

// --- Tests ---

describe("Bubble", () => {
    test("measured → its content, with room for its point, edge and padding on each side", () => {
        const setup = uiSetup()
        const bubble = shownBubble(setup)
        const room = roomOf(setup)
        expect(bubble.bounds.width).toBe(40 + 2 * room)
        expect(bubble.bounds.height).toBe(20 + 2 * room)
        expect(bubble.content?.bounds.x).toBe(room)
    })

    test("pointed at a point → aims at it; its point hidden → aims at nothing", () => {
        const bubble = new Bubble(uiSetup().theme)
        expect(bubble.target).toBeNull()
        bubble.pointAt(30, -40)
        expect(bubble.target).toEqual({ x: 30, y: -40 })
        bubble.hidePoint()
        expect(bubble.target).toBeNull()
    })

    test("pointed at points around it, at a corner, inside its face, or not shown → drawn without fail", () => {
        const setup = uiSetup()
        const bubble = shownBubble(setup)
        const { width, height } = bubble.bounds
        const targets = [
            [width + 100, height / 2], [-50, -50], [width / 2, height + 30], [width / 2, height / 2],
        ]
        for(const [x, y] of targets){
            bubble.pointAt(x, y)
            expect(() => setup.ui.render()).not.toThrow()
        }
        const alone = new Bubble(setup.theme)
        alone.pointAt(500, 500)
        expect(alone.target).toEqual({ x: 500, y: 500 })
    })
})

describe("text outline", () => {
    test("an outlined label → one pixel more on each side than the same text bare", () => {
        const { theme } = uiSetup()
        const bare = new Label(theme, "abc").measure(Infinity)
        const outlined = new Label(theme, "abc", { outline: BLACK }).measure(Infinity)
        expect(bare.preferredWidth).toBe(3 * ADVANCE)
        expect(outlined.preferredWidth).toBe(3 * ADVANCE + 2)
        expect(outlined.preferredHeight).toBe(LINE + 2)
    })

    test("an outlined paragraph → wrapped at the width less its outline, one pixel more on each side", () => {
        const { theme } = uiSetup()
        const outlined = new Paragraph(theme, "ab cd", { outline: BLACK }).measure(5 * ADVANCE + 2)
        expect(outlined.preferredHeight).toBe(LINE + 2)
        const cut = new Paragraph(theme, "ab cd", { outline: BLACK }).measure(5 * ADVANCE)
        expect(cut.preferredHeight).toBe(2 * LINE + 2)
    })
})
