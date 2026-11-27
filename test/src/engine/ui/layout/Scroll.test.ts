import { describe, expect, test } from "vitest"
import { Box } from "@game/core-src/engine/ui/layout/Box"
import { Scroll, WHEEL_STEP } from "@game/core-src/engine/ui/layout/Scroll"

import { Probe, uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Tests ---

describe("Scroll", () => {
    function list(setup: UiSetup): { scroll: Scroll, items: Probe[] } {
        const scroll = new Scroll(setup.theme, { width: 20, height: 30 })
        const column = new Box("column")
        const items = Array.from({ length: 10 }, (_, index) => new Probe(`i${index}`, [10, 10], { focusable: true }))
        for(const item of items) column.add(item)
        scroll.content = column
        setup.main.content.add(scroll)
        setup.ui.render()
        return { scroll, items }
    }

    test("focus on a child out of view → scrolled to it", () => {
        const setup = uiSetup()
        const { scroll, items } = list(setup)
        expect(scroll.overflows).toBe(true)
        items[6].focus()
        expect(scroll.offset).toBe(40)
    })

    test("scrollIntoView at the start on a horizontal row → child at the left, clamped to the end", () => {
        const setup = uiSetup()
        const scroll = new Scroll(setup.theme, { axis: "horizontal", width: 30, height: 20 })
        const row = new Box("row")
        const items = Array.from({ length: 10 }, (_, index) => new Probe(`i${index}`, [10, 10]))
        for(const item of items) row.add(item)
        scroll.content = row
        setup.main.content.add(scroll)
        setup.ui.render()
        items[3].scrollIntoView("start")
        expect(scroll.offset).toBe(30)
        items[9].scrollIntoView("start")
        expect(scroll.offset).toBe(70)
    })

    test("scrollToEnd with a content growing → at its new end, once laid out", () => {
        const setup = uiSetup()
        const { scroll } = list(setup)
        const column = scroll.content
        if(!(column instanceof Box)) throw new Error("The content of the list is a column.")
        scroll.scrollToEnd()
        column.add(new Probe("added", [10, 10]))
        setup.ui.render()
        expect(scroll.offset).toBe(80)
    })

    test("the wheel → a step per notch, kept in the content", () => {
        const setup = uiSetup()
        const { scroll } = list(setup)
        setup.port.send({ type: "pointer-move", x: 5, y: 5 }, { type: "wheel", dx: 0, dy: 1 })
        setup.frame()
        expect(scroll.offset).toBe(WHEEL_STEP)
        // Many notches at once never go further than the view is high.
        const view = scroll.bounds.height
        setup.port.send({ type: "wheel", dx: 0, dy: 10 })
        setup.frame()
        expect(scroll.offset).toBe(WHEEL_STEP + view)
        setup.port.send({ type: "wheel", dx: 0, dy: 10 }, { type: "wheel", dx: 0, dy: 10 })
        setup.frame()
        expect(scroll.offset).toBe(70)
    })

    test("content that fits → the wheel is not consumed, the scroll around it moves", () => {
        const setup = uiSetup()
        const inner = new Scroll(setup.theme, { width: 20, height: 30 })
        inner.content = new Probe("small", [10, 10])
        const column = new Box("column")
        column.add(inner)
        column.add(new Probe("tall", [10, 100]))
        const outer = new Scroll(setup.theme, { width: 20, height: 30 })
        outer.content = column
        setup.main.content.add(outer)
        setup.ui.render()
        expect(inner.overflows).toBe(false)
        setup.port.send({ type: "pointer-move", x: 5, y: 5 }, { type: "wheel", dx: 0, dy: 1 })
        setup.frame()
        expect(inner.offset).toBe(0)
        expect(outer.offset).toBe(WHEEL_STEP)
    })

    test("without a bar, overflowing → the content keeps the whole width", () => {
        const setup = uiSetup()
        const scroll = new Scroll(setup.theme, { width: 20, height: 30, bar: false })
        const content = new Probe("tall", [10, 100])
        scroll.content = content
        setup.main.content.add(scroll)
        setup.ui.render()
        expect(scroll.overflows).toBe(true)
        expect(content.bounds.width).toBe(20)
    })

    test("without a bar → the wheel still scrolls, a press on its side does not", () => {
        const setup = uiSetup()
        const scroll = new Scroll(setup.theme, { width: 20, height: 30, bar: false })
        scroll.content = new Probe("tall", [10, 100])
        setup.main.content.add(scroll)
        setup.ui.render()
        setup.port.send({ type: "pointer-move", x: 19, y: 25 }, { type: "pointer-down", button: 0, x: 19, y: 25 })
        setup.frame()
        expect(scroll.offset).toBe(0)
        setup.port.send({ type: "wheel", dx: 0, dy: 1 })
        setup.frame()
        expect(scroll.offset).toBe(WHEEL_STEP)
    })

    test("without the wheel → a notch scrolls nothing, the offset still does", () => {
        const setup = uiSetup()
        const scroll = new Scroll(setup.theme, { width: 20, height: 30, wheel: false })
        scroll.content = new Probe("tall", [10, 100])
        setup.main.content.add(scroll)
        setup.ui.render()
        setup.port.send({ type: "pointer-move", x: 5, y: 5 }, { type: "wheel", dx: 0, dy: 1 })
        setup.frame()
        expect(scroll.offset).toBe(0)
        scroll.offset = 12
        expect(scroll.offset).toBe(12)
    })

    test("with a bar, overflowing → the bar takes its width from the content", () => {
        const setup = uiSetup()
        const scroll = new Scroll(setup.theme, { width: 20, height: 30 })
        const content = new Probe("tall", [10, 100])
        scroll.content = content
        setup.main.content.add(scroll)
        setup.ui.render()
        expect(content.bounds.width).toBe(20 - setup.theme.scrollbar.width)
    })
})
