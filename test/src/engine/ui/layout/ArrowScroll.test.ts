import { describe, expect, test } from "vitest"
import { ArrowScroll } from "@game/core-src/engine/ui/layout/ArrowScroll"

import { Probe, uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** An arrow scroll holding a probe of a size, laid in the interface. */
function holding(setup: UiSetup, width: number, height: number): ArrowScroll {
    const arrows = new ArrowScroll(setup.theme)
    arrows.content = new Probe("content", [width, height])
    setup.main.content.add(arrows)
    setup.ui.render()
    return arrows
}

// --- Tests ---

describe("ArrowScroll", () => {
    test("content that fits → no arrow is shown", () => {
        const arrows = holding(uiSetup(), 100, 20)
        expect(arrows.leftButton.visible).toBe(false)
        expect(arrows.rightButton.visible).toBe(false)
    })

    test("content wider than the room, at the start → only the right arrow is shown", () => {
        const arrows = holding(uiSetup(), 1000, 20)
        expect(arrows.scroll.overflows).toBe(true)
        expect(arrows.leftButton.visible).toBe(false)
        expect(arrows.rightButton.visible).toBe(true)
    })

    test("the right arrow pressed → scrolled, both arrows shown, then only the left at the end", () => {
        const setup = uiSetup()
        const arrows = holding(setup, 1000, 20)
        arrows.rightButton.onActivate?.()
        setup.ui.render()
        expect(arrows.scroll.offset).toBeGreaterThan(0)
        expect(arrows.leftButton.visible).toBe(true)
        expect(arrows.rightButton.visible).toBe(true)
        for(let press = 0; press < 20; press++) arrows.rightButton.onActivate?.()
        setup.ui.render()
        expect(arrows.scroll.offset).toBe(arrows.scroll.maxOffset)
        expect(arrows.leftButton.visible).toBe(true)
        expect(arrows.rightButton.visible).toBe(false)
    })

    test("the left arrow pressed → scrolled back, hidden at the start", () => {
        const setup = uiSetup()
        const arrows = holding(setup, 1000, 20)
        arrows.rightButton.onActivate?.()
        arrows.leftButton.onActivate?.()
        setup.ui.render()
        expect(arrows.scroll.offset).toBe(0)
        expect(arrows.leftButton.visible).toBe(false)
    })

    test("the content → the scroll is as high as it, nothing below", () => {
        const arrows = holding(uiSetup(), 1000, 37)
        expect(arrows.bounds.height).toBe(37)
    })

    test("the wheel over it → not consumed, it does not scroll across", () => {
        const setup = uiSetup()
        const arrows = holding(setup, 1000, 20)
        setup.port.send({ type: "pointer-move", x: 40, y: 10 }, { type: "wheel", dx: 0, dy: 1 })
        setup.frame()
        expect(arrows.scroll.offset).toBe(0)
    })
})
