import { describe, expect, test, vi } from "vitest"
import { Paragraph } from "@game/core"

import { ADVANCE, LINE, uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

const LINK = {}

/** A text whose second word links, and the setup showing it. */
function shown(onLink?: (link: object|null) => void): { readonly setup: UiSetup } {
    const setup = uiSetup()
    const text = ["ab ", { link: LINK, text: "cd" }]
    const paragraph = new Paragraph(setup.theme, text, onLink ? { onLink } : {})
    setup.main.content.add(paragraph, { x: "start", y: "start" })
    setup.ui.update(1 / 60)
    setup.ui.render()
    return { setup }
}

function point(setup: UiSetup, x: number, y: number): void {
    setup.port.send({ type: "pointer-move", x, y })
    setup.frame()
}

// --- Tests ---

describe("Paragraph", () => {
    test("no listener → leaves the pointer to what lies under, links or not", () => {
        const { setup } = shown()
        point(setup, 4 * ADVANCE, 1)
        expect(setup.ui.hovered).toBeNull()
    })

    test("a listener but no link → leaves the pointer too", () => {
        const setup = uiSetup()
        setup.main.content.add(new Paragraph(setup.theme, "ab", { onLink: () => {} }), { x: "start", y: "start" })
        setup.ui.update(1 / 60)
        setup.ui.render()
        point(setup, 1, 1)
        expect(setup.ui.hovered).toBeNull()
    })

    test("the pointer over a link → told once, with where the word lies", () => {
        const heard = vi.fn()
        const { setup } = shown(heard)
        point(setup, 3 * ADVANCE + 1, 1)
        point(setup, 3 * ADVANCE + 2, 1)
        expect(heard).toHaveBeenCalledTimes(1)
        expect(heard.mock.calls[0][0]).toBe(LINK)
        const area = { x: 3 * ADVANCE, y: 0, width: 2 * ADVANCE, height: LINE }
        expect(heard.mock.calls[0][1]).toMatchObject(area)
    })

    test("the pointer leaving the link → told, on the text and out of the paragraph", () => {
        const heard = vi.fn()
        const { setup } = shown(heard)
        point(setup, 3 * ADVANCE + 1, 1)
        point(setup, 1, 1)
        expect(heard).toHaveBeenLastCalledWith(null, null)
        point(setup, 3 * ADVANCE + 1, 1)
        point(setup, 200, 100)
        expect(heard).toHaveBeenLastCalledWith(null, null)
        expect(heard).toHaveBeenCalledTimes(4)
    })
})
