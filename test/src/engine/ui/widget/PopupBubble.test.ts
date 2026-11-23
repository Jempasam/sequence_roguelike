import { describe, expect, test } from "vitest"
import { Paragraph, PopupBubble } from "@game/core"
import type { Panel } from "@game/core"

import { ADVANCE, LINE, Probe, uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A bubble in the popup layer, 60 wide at most. */
function bench(maxWidth = 60): { setup: UiSetup, bubble: PopupBubble } {
    const setup = uiSetup()
    setup.ui.render()
    return { setup, bubble: new PopupBubble(setup.popup, setup.theme, maxWidth) }
}

// --- Tests ---

describe("PopupBubble", () => {
    test("shown at a point → it is in the layer under the point, in its frame", () => {
        const { setup, bubble } = bench()
        bubble.show(new Probe("content", [20, 10]), { x: 10, y: 10 })
        const { padding } = setup.theme.tooltip
        expect(bubble.open).toBe(true)
        expect(setup.popup.content.children).toContain(bubble.panel)
        expect(bubble.panel.fixedSize).toEqual({ width: 20 + 2 * padding, height: 10 + 2 * padding })
        expect(bubble.placement).toEqual({ x: 10, y: 10, side: "below" })
    })

    test("a text longer than the widest → it goes on over more lines, at the widest", () => {
        const { setup, bubble } = bench()
        const text = "a".repeat(40)
        bubble.show(new Paragraph(setup.theme, text), { x: 0, y: 0 })
        const { padding } = setup.theme.tooltip
        const size = bubble.panel.fixedSize!
        expect(size.width).toBeLessThanOrEqual(60)
        expect(size.height).toBeGreaterThan(LINE + 2 * padding)
        expect(size.width).toBeGreaterThan(ADVANCE)
    })

    test("shown again with another content → it changes in place, not shown twice", () => {
        const { setup, bubble } = bench()
        bubble.show(new Probe("one", [20, 10]), { x: 10, y: 10 })
        bubble.show(new Probe("two", [30, 10]), { x: 40, y: 20 })
        const { padding } = setup.theme.tooltip
        expect(setup.popup.content.children.filter(child => child === bubble.panel)).toHaveLength(1)
        expect(bubble.panel.fixedSize!.width).toBe(30 + 2 * padding)
        expect(bubble.placement).toMatchObject({ x: 40, y: 20 })
    })

    test("a target of a component → the bubble opens under its area", () => {
        const { setup, bubble } = bench()
        const target = new Probe("target", [20, 10])
        setup.main.content.add(target, { offsetX: 30, offsetY: 5 })
        setup.ui.render()
        bubble.show(new Probe("content", [10, 10]), target)
        expect(bubble.placement).toEqual({ x: 30, y: 15, side: "below" })
    })

    test("no room under the target, over it wanted second → it opens over", () => {
        const { bubble } = bench()
        bubble.show(new Probe("content", [10, 10]), { x: 10, y: 175 })
        expect(bubble.placement?.side).toBe("above")
    })

    test("outlined → a rectangle one pixel larger lies under its frame, hidden when not outlined", () => {
        const { setup, bubble } = bench()
        bubble.show(new Probe("content", [20, 10]), { x: 10, y: 10 })
        const [shadow, outline] = setup.popup.content.children
        expect(shadow).not.toBe(bubble.panel)
        expect(outline.visible).toBe(false)
        bubble.outline = "white"
        expect(outline.visible).toBe(true)
        expect(outline.fixedSize!.width).toBe(bubble.panel.fixedSize!.width + 2)
        expect(setup.popup.content.children[2]).toBe(bubble.panel)
        bubble.outline = "none"
        expect(outline.visible).toBe(false)
    })

    test("outlined in grey then in white → the outline changes color, and stays shown", () => {
        const { setup, bubble } = bench()
        bubble.show(new Probe("content", [20, 10]), { x: 10, y: 10 })
        const outline = setup.popup.content.children[1] as Panel
        bubble.outline = "grey"
        const grey = outline.background
        bubble.outline = "white"
        expect(outline.background).not.toBe(grey)
        expect(bubble.outline).toBe("white")
        expect(outline.visible).toBe(true)
    })

    test("closed → it leaves the layer and may be shown again", () => {
        const { setup, bubble } = bench()
        bubble.show(new Probe("content", [10, 10]), { x: 10, y: 10 })
        bubble.close()
        expect(bubble.open).toBe(false)
        expect(setup.popup.content.children).not.toContain(bubble.panel)
        bubble.show(new Probe("content", [10, 10]), { x: 10, y: 10 })
        expect(bubble.open).toBe(true)
    })
})
