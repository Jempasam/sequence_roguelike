import { describe, expect, test } from "vitest"
import { STEP, TURNS } from "@game/core/mecard"
import type { Card } from "@game/core/mecard"
import { CardView } from "@game/core/mecard/card-view"
import type { CardPlace } from "@game/core/mecard/card-view"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A card view on the screen, laid out. */
function shown(card: Card, place: CardPlace = "hand"): { setup: UiSetup, view: CardView } {
    const setup = uiSetup()
    const view = new CardView(setup.theme, card, place)
    setup.main.content.add(view)
    setup.ui.render()
    return { setup, view }
}

/** Click a point of a view, given from its top left corner. */
function click(setup: UiSetup, view: CardView, dx: number, dy: number): void {
    const x = view.bounds.x + dx
    const y = view.bounds.y + dy
    setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
    setup.port.send({ type: "pointer-up", button: 0, x, y })
    setup.frame()
}

// --- Tests ---

describe("CardView, activation", () => {
    test("none by default, set and read back", () => {
        const { view } = shown(STEP)
        expect(view.activation).toBeNull()
        view.activation = ""
        expect(view.activation).toBe("")
        view.activation = "[2]"
        expect(view.activation).toBe("[2]")
    })

    test("a card played unlimited → only a look, off by default", () => {
        const { view } = shown(STEP)
        expect(view.unlimited).toBe(false)
        view.unlimited = true
        expect(view.unlimited).toBe(true)
    })
})

describe("CardView, the dial of a turn", () => {
    /** Where the dial of a card in the hand is, from the top left of the view, in the test font. */
    function dialAt(view: CardView): { cx: number, cy: number, radius: number } {
        return { cx: view.bounds.width / 2, cy: 1 + 4 + 3 + 6 + 1 + 11, radius: 11 }
    }

    test("a click on the dial → the step it points at, no pick", () => {
        const { setup, view } = shown(TURNS[0])
        const picked: string[] = []
        view.onPick = () => picked.push("pick")
        view.onDial = step => picked.push(`dial ${step}`)
        const { cx, cy, radius } = dialAt(view)
        click(setup, view, cx + radius * 0.8, cy)
        click(setup, view, cx, cy + radius * 0.8)
        expect(picked).toEqual(["dial 4", "dial 8"])
    })

    test("the pointer over the dial → the dial lights, not the card; elsewhere the card does", () => {
        const { setup, view } = shown(TURNS[0])
        view.onDial = () => {}
        const move = (dx: number, dy: number): void => {
            const x = view.bounds.x + dx
            const y = view.bounds.y + dy
            setup.port.send({ type: "pointer-move", x, y })
            setup.frame()
        }
        const { cx, cy } = dialAt(view)
        // Private state is not read: what is told is that the view repaints when the pointer crosses the dial.
        let paints = 0
        const invalidate = view.invalidate.bind(view)
        view.invalidate = () => { paints++; invalidate() }
        move(3, 3)
        const before = paints
        move(cx + 4, cy)
        expect(paints).toBeGreaterThan(before)
        const onDial = paints
        move(cx + 5, cy)
        expect(paints).toBe(onDial)
        move(3, 3)
        expect(paints).toBeGreaterThan(onDial)
    })

    test("a click at the center of the dial → neither a step nor a pick; the pointer there lights the dial", () => {
        const { setup, view } = shown(TURNS[0])
        const told: string[] = []
        view.onPick = () => told.push("pick")
        view.onDial = step => told.push(`dial ${step}`)
        const { cx, cy } = dialAt(view)
        let paints = 0
        const invalidate = view.invalidate.bind(view)
        view.invalidate = () => { paints++; invalidate() }
        setup.port.send({ type: "pointer-move", x: view.bounds.x + 3, y: view.bounds.y + 3 })
        setup.frame()
        const before = paints
        setup.port.send({ type: "pointer-move", x: view.bounds.x + cx, y: view.bounds.y + cy })
        setup.frame()
        expect(paints).toBeGreaterThan(before)
        click(setup, view, cx, cy)
        expect(told).toEqual([])
    })

    test("a click elsewhere on the card → a pick", () => {
        const { setup, view } = shown(TURNS[0])
        const picked: string[] = []
        view.onPick = () => picked.push("pick")
        view.onDial = step => picked.push(`dial ${step}`)
        click(setup, view, 3, 3)
        expect(picked).toEqual(["pick"])
    })

    test("no one listening to the dial → a click on it is a pick", () => {
        const { setup, view } = shown(TURNS[0])
        let picks = 0
        view.onPick = () => picks++
        const { cx, cy } = dialAt(view)
        click(setup, view, cx + 6, cy)
        expect(picks).toBe(1)
    })

    test("a card that is no turn, or a turn in a small place → no dial", () => {
        const step = shown(STEP)
        let dials = 0
        step.view.onDial = () => dials++
        const { cx, cy } = dialAt(step.view)
        click(step.setup, step.view, cx + 6, cy)
        const mini = shown(TURNS[0], "mini")
        mini.view.onDial = () => dials++
        click(mini.setup, mini.view, 16 + 4, 12)
        expect(dials).toBe(0)
    })
})
