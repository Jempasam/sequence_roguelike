import { describe, expect, test } from "vitest"
import { STEP, TURNS, UNIVERSAL_ELEMENTS, WALKS } from "@game/core/mecard"
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

describe("CardView, the dial of the directions", () => {
    /** Where the dial of a card in the hand is, from the top left of the view, in the test font. */
    function dialAt(view: CardView): { cx: number, cy: number, radius: number } {
        return { cx: view.bounds.width / 2, cy: 1 + 5 + 3 + 6 + 1 + 11, radius: 11 }
    }

    test("a click on the dial → the step it points at, no pick", () => {
        const { setup, view } = shown(TURNS[0])
        const picked: string[] = []
        view.onPick = () => picked.push("pick")
        view.onVariant = variant => picked.push(`variant ${TURNS.indexOf(variant as never)}`)
        const { cx, cy, radius } = dialAt(view)
        click(setup, view, cx + radius * 0.8, cy)
        click(setup, view, cx, cy + radius * 0.8)
        expect(picked).toEqual(["variant 8", "variant 16"])
    })

    test("the pointer over the dial → the dial lights, not the card; elsewhere the card does", () => {
        const { setup, view } = shown(TURNS[0])
        view.onVariant = () => {}
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
        view.onVariant = variant => told.push(`variant ${TURNS.indexOf(variant as never)}`)
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
        view.onVariant = variant => picked.push(`variant ${TURNS.indexOf(variant as never)}`)
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
        step.view.onVariant = () => dials++
        const { cx, cy } = dialAt(step.view)
        click(step.setup, step.view, cx + 6, cy)
        const mini = shown(TURNS[0], "mini")
        mini.view.onVariant = () => dials++
        click(mini.setup, mini.view, 16 + 4, 12)
        expect(dials).toBe(0)
    })
})

describe("CardView, a drag on the dial", () => {
    test("the needle follows the pointer, and the variant is chosen once, when it is let go", () => {
        const { setup, view } = shown(TURNS[0])
        const chosen: Card[] = []
        view.onVariant = variant => chosen.push(variant)
        const cx = view.bounds.x + view.bounds.width / 2
        const cy = view.bounds.y + 1 + 5 + 3 + 6 + 1 + 11
        const send = (...events: Parameters<typeof setup.port.send>): void => { setup.port.send(...events); setup.frame() }
        send({ type: "pointer-move", x: cx + 8, y: cy }, { type: "pointer-down", button: 0, x: cx + 8, y: cy })
        // Dragged out of the disc, to the bottom: the pointer stays the dial's.
        send({ type: "pointer-move", x: cx, y: cy + 30 })
        expect(chosen).toEqual([])
        send({ type: "pointer-up", button: 0, x: cx, y: cy + 30 })
        expect(chosen).toEqual([TURNS[16]])
    })

    test("let go where it was pressed, on the direction the card already has → nothing chosen", () => {
        const { setup, view } = shown(TURNS[0])
        const chosen: Card[] = []
        view.onVariant = variant => chosen.push(variant)
        click(setup, view, view.bounds.width / 2, 1 + 5 + 3 + 6 + 1 + 11 - 8)
        expect(chosen).toEqual([])
    })
})

describe("CardView, the chips of a card with a few variants", () => {
    /** The middle of the chip of a variant, from the top left of a card in the hand, in the test font. */
    function chipAt(index: number): { dx: number, dy: number } {
        return { dx: 3 + (index % 3) * 13 + 6, dy: 1 + 5 + 3 + 6 + 1 + Math.floor(index / 3) * 10 + 4 }
    }

    test("numbers → a stepper: the arrows choose the variant before and after, no pick", () => {
        const { setup, view } = shown(WALKS[1])
        const told: string[] = []
        view.onPick = () => told.push("pick")
        view.onVariant = variant => told.push(`walk ${WALKS.indexOf(variant as never)}`)
        click(setup, view, 7, 20)
        click(setup, view, 36, 20)
        expect(told).toEqual(["walk 0", "walk 2"])
    })

    test("the first walk, the arrow before → the last one, around", () => {
        const { setup, view } = shown(WALKS[0])
        const told: Card[] = []
        view.onVariant = variant => told.push(variant)
        click(setup, view, 7, 20)
        expect(told).toEqual([WALKS[4]])
    })

    test("the elements, dots of color → each dot chooses its element", () => {
        const { setup, view } = shown(UNIVERSAL_ELEMENTS[0])
        const chosen: Card[] = []
        view.onVariant = variant => chosen.push(variant)
        const { dx, dy } = chipAt(4)
        click(setup, view, dx, dy)
        expect(chosen).toEqual([UNIVERSAL_ELEMENTS[4]])
    })

    test("no one listening, or a small place → a click on a chip is a pick", () => {
        const { setup, view } = shown(WALKS[1])
        let picks = 0
        view.onPick = () => picks++
        click(setup, view, 7, 20)
        expect(picks).toBe(1)
        const mini = shown(WALKS[1], "mini")
        let chosen = 0
        mini.view.onVariant = () => chosen++
        click(mini.setup, mini.view, 8, 12)
        expect(chosen).toBe(0)
    })
})
