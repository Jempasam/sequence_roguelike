import { describe, expect, test } from "vitest"
import { plainText, Rect } from "@game/core"
import type { Text } from "@game/core"
import { FusionCard, STEP, THRUST } from "@game/core/mecard"
import type { Card } from "@game/core/mecard"
import { cardDetail } from "@game/core/mecard/card-detail"
import type { DetailShown } from "@game/core/mecard/detail"
import { CardView } from "@game/core/mecard/card-view"
import { cardText } from "@game/core/mecard/shown"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A view of a card on the screen, laid out, the pointer away. */
function shown(card: Card): { setup: UiSetup, view: CardView } {
    const setup = uiSetup()
    const view = new CardView(setup.theme, card, "hand")
    setup.main.content.add(view, { offsetX: 0, offsetY: 0 })
    setup.ui.render()
    moveTo(setup, 300, 170)
    return { setup, view }
}

function moveTo(setup: UiSetup, x: number, y: number): void {
    setup.port.send({ type: "pointer-move", x, y })
    setup.frame()
}

/** The middle of a card held, as a point of the layers. */
function middleOf(view: CardView, path: readonly number[]): { x: number, y: number } {
    const rect = new Rect()
    if(!view.partRect(path, rect)) throw new Error(`No card held at ${path.join(".")}.`)
    return { x: view.bounds.x + rect.x + rect.width / 2, y: view.bounds.y + rect.y + rect.height / 2 }
}

const said = (text: Text|null): string|null => text === null ? null : plainText(text)

/** What a detail shows, as a plain text. */
const told = (shown: DetailShown|null): string|null => said(shown?.text ?? null)

/** Where a card held is drawn, in the coordinates of the layers. */
function layerRect(view: CardView, path: readonly number[]): Rect {
    const rect = new Rect()
    view.partRect(path, rect)
    return rect.translate(view.bounds.x, view.bounds.y)
}

// --- Tests ---

describe("CardView.partRect", () => {
    test("fusion of two cards → their rectangles lie side by side inside the view", () => {
        const { view } = shown(new FusionCard([THRUST, STEP]))
        const first = new Rect()
        const second = new Rect()
        expect(view.partRect([0], first)).toBe(true)
        expect(view.partRect([1], second)).toBe(true)
        expect(first.x + first.width).toBeLessThanOrEqual(second.x)
        expect(second.x + second.width).toBeLessThanOrEqual(view.bounds.width)
        expect(first.y).toBeGreaterThan(0)
    })

    test("card holding none → no rectangle for a card held", () => {
        const { view } = shown(THRUST)
        expect(view.partRect([0], new Rect())).toBe(false)
    })
})

describe("cardDetail", () => {
    test("pointer over a card of a fusion → it tells about that card, not the fusion", () => {
        const fusion = new FusionCard([THRUST, STEP])
        const { view } = shown(fusion)
        const detail = cardDetail(view)
        const first = middleOf(view, [0])
        const second = middleOf(view, [1])
        expect(told(detail.at(first.x, first.y))).toBe(said(cardText(THRUST)))
        expect(told(detail.at(second.x, second.y))).toBe(said(cardText(STEP)))
    })

    test("pointer over a card of a fusion → what the text is about is where that card is drawn", () => {
        const { view } = shown(new FusionCard([THRUST, STEP]))
        const detail = cardDetail(view)
        const second = middleOf(view, [1])
        expect(detail.at(second.x, second.y)?.area).toEqual(layerRect(view, [1]))
    })

    test("pointer over the fusion itself → what the text is about is the whole view", () => {
        const { view } = shown(new FusionCard([THRUST, STEP]))
        const detail = cardDetail(view)
        const corner = { x: view.bounds.x, y: view.bounds.y }
        const area = detail.at(corner.x, corner.y)?.area
        expect(area).toEqual(new Rect(view.bounds.x, view.bounds.y, view.bounds.width, view.bounds.height))
    })

    test("pointer moving over the same card → the text is the same object, so it is told once", () => {
        const { view } = shown(new FusionCard([THRUST, STEP]))
        const detail = cardDetail(view)
        const second = middleOf(view, [1])
        expect(detail.at(second.x, second.y)?.text).toBe(detail.at(second.x + 1, second.y)?.text)
    })

    test("pointer over a card of a fusion held by a fusion → the deepest card tells", () => {
        const inner = new FusionCard([THRUST, STEP])
        const outer = new FusionCard([inner, STEP])
        const { view } = shown(outer)
        const detail = cardDetail(view)
        const deep = middleOf(view, [0, 1])
        const beside = middleOf(view, [1])
        expect(told(detail.at(deep.x, deep.y))).toBe(said(cardText(STEP)))
        expect(told(detail.at(beside.x, beside.y))).toBe(said(cardText(STEP)))
        const innerBand = middleOf(view, [0])
        expect(told(detail.at(innerBand.x, view.bounds.y + 1))).toBe(said(cardText(inner)))
    })

    test("pointer going from a card of a fusion to the other → each is shown in turn, then hidden", () => {
        const { setup, view } = shown(new FusionCard([THRUST, STEP]))
        const detail = cardDetail(view)
        const heard: (string|null)[] = []
        detail.listen({ onShow: shown => heard.push(told(shown)), onHide: () => heard.push(null) })
        const first = middleOf(view, [0])
        const second = middleOf(view, [1])
        moveTo(setup, first.x, first.y)
        moveTo(setup, second.x, second.y)
        moveTo(setup, 300, 170)
        expect(heard).toEqual([said(cardText(THRUST)), said(cardText(STEP)), null])
    })

    test("card with no face → it tells nothing", () => {
        const setup = uiSetup()
        const view = new CardView(setup.theme, null, "hand")
        expect(cardDetail(view).shown).toBeNull()
    })
})
