import { describe, expect, test } from "vitest"
import { Stack } from "@game/core-src/engine/ui/layout/Stack"

import { Probe, uiSetup } from "../../fixtures/uiFixtures"
import type { UiSetup } from "../../fixtures/uiFixtures"

/** A row of two interactive probes, `a` over x 0..20 and `b` over x 20..40. */
function row(): { setup: UiSetup, box: Stack, a: Probe, b: Probe } {
    const setup = uiSetup()
    const box = new Stack()
    const a = new Probe("a", [20, 20], { interactive: true })
    const b = new Probe("b", [20, 20], { interactive: true })
    box.add(a, { offsetX: 0, offsetY: 0 })
    box.add(b, { offsetX: 20, offsetY: 0 })
    setup.main.content.add(box)
    setup.ui.render()
    return { setup, box, a, b }
}

/** Move the pointer and let the interface hear it. */
function moveTo(setup: UiSetup, x: number, y: number): void {
    setup.port.send({ type: "pointer-move", x, y })
    setup.frame()
}

describe("Component.listenHover", () => {
    test("pointer over it then away → every listener hears true then false", () => {
        const { setup, a } = row()
        const first: boolean[] = []
        const second: boolean[] = []
        a.listenHover(over => first.push(over))
        a.listenHover(over => second.push(over))
        moveTo(setup, 5, 5)
        moveTo(setup, 100, 100)
        expect(first).toEqual([true, false])
        expect(second).toEqual([true, false])
    })

    test("removed listener → it hears nothing more, the others still do", () => {
        const { setup, a } = row()
        const kept: boolean[] = []
        const gone: boolean[] = []
        a.listenHover(over => kept.push(over))
        a.listenHover(over => gone.push(over)).remove()
        moveTo(setup, 5, 5)
        expect(kept).toEqual([true])
        expect(gone).toEqual([])
    })

    test("pointer over a sibling → it hears nothing", () => {
        const { setup, a } = row()
        moveTo(setup, 100, 100)
        const heard: boolean[] = []
        a.listenHover(over => heard.push(over))
        moveTo(setup, 25, 5)
        expect(heard).toEqual([])
    })
})

describe("Component.listenPointerMove", () => {
    test("pointer moving over a child → the container hears it, with the pointer where it is", () => {
        const { setup, box } = row()
        moveTo(setup, 100, 100)
        const heard: string[] = []
        box.listenPointerMove(() => heard.push(`${box.pointerX},${box.pointerY}`))
        moveTo(setup, 5, 5)
        moveTo(setup, 25, 7)
        expect(heard).toEqual(["5,5", "25,7"])
    })

    test("removed listener → it hears nothing more", () => {
        const { setup, box } = row()
        let heard = 0
        box.listenPointerMove(() => heard++).remove()
        moveTo(setup, 5, 5)
        expect(heard).toBe(0)
    })
})

describe("Component.listenHoverWithin", () => {
    test("pointer over a child → the container hears true, and false once away", () => {
        const { setup, box } = row()
        const heard: boolean[] = []
        box.listenHoverWithin(over => heard.push(over))
        moveTo(setup, 5, 5)
        moveTo(setup, 100, 100)
        expect(heard.at(0)).toBe(true)
        expect(heard.at(-1)).toBe(false)
    })

    test("pointer moving from a child to its sibling → the container never hears false", () => {
        const { setup, box } = row()
        const heard: boolean[] = []
        box.listenHoverWithin(over => heard.push(over))
        moveTo(setup, 5, 5)
        moveTo(setup, 25, 5)
        expect(heard).not.toContain(false)
    })

    test("hoveredWithin → true on the container and the child over, false on the sibling", () => {
        const { setup, box, a, b } = row()
        moveTo(setup, 5, 5)
        expect([box.hoveredWithin, a.hoveredWithin, b.hoveredWithin]).toEqual([true, true, false])
        expect([box.hovered, a.hovered, b.hovered]).toEqual([false, true, false])
    })
})
