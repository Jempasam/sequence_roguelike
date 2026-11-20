import { describe, expect, test } from "vitest"
import { QuitPopup } from "@game/core/mecard/quit-popup"

import { uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A popup open, and what its "Quitter" told. */
function opened(setup: UiSetup) {
    const popup = new QuitPopup(setup.theme, setup.popup)
    const told: string[] = []
    popup.open(() => told.push("quit"))
    setup.ui.render()
    return { popup, told }
}

// --- Tests ---

describe("QuitPopup", () => {
    test("opened → modal, the focus on the button that stays", () => {
        const setup = uiSetup()
        const { popup } = opened(setup)
        expect(popup.isOpen).toBe(true)
        expect(setup.popup.modal).toBe(true)
        expect(setup.ui.focused).toBe(popup.stayButton)
    })

    test("escape → closed, and the press consumed", () => {
        const setup = uiSetup()
        const { popup, told } = opened(setup)
        setup.port.keyDown("Escape").keyUp("Escape")
        setup.ui.handle(setup.frame())
        expect(popup.isOpen).toBe(false)
        expect(setup.ui.actions.occurrences.every(occurrence => occurrence.consumed)).toBe(true)
        expect(told).toEqual([])
    })

    test("Rester → closed, nothing told", () => {
        const setup = uiSetup()
        const { popup, told } = opened(setup)
        popup.stayButton.activate()
        expect(popup.isOpen).toBe(false)
        expect(told).toEqual([])
    })

    test("Quitter → closed, then told", () => {
        const setup = uiSetup()
        const { popup, told } = opened(setup)
        const quit = popup.content?.children[1]
        expect(quit).toBeDefined()
        ;(quit as unknown as { activate(): void }).activate()
        expect(popup.isOpen).toBe(false)
        expect(told).toEqual(["quit"])
    })
})
