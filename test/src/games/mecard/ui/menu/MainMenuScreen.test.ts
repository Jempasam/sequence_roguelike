import { describe, expect, test } from "vitest"
import { AssetError } from "@game/core"
import type { Assets } from "@game/core"
import { MainMenuScreen } from "@game/core/mecard/menu"

import { uiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** Pictures that never load, whatever is asked for. */
const NO_ASSETS = new Proxy({}, {
    get: () => (path: string) => Promise.reject(new AssetError(path, "unreadable", "none in the tests")),
}) as unknown as Assets

/** A menu, and what it was told. */
function menu() {
    const setup = uiSetup({}, 320, 180)
    const told: string[] = []
    const screen = new MainMenuScreen(setup.theme, setup.ui, {
        newGame: () => told.push("new"),
        continueGame: () => told.push("continue"),
        openGuide: () => told.push("guide"),
        report: text => told.push(`report: ${text}`),
    }, NO_ASSETS)
    screen.visible = true
    screen.frame()
    return { screen, told }
}

// --- Tests ---

describe("MainMenuScreen", () => {
    test("no game kept → Continue greyed out, New game starts at once", () => {
        const { screen, told } = menu()
        expect(screen.continueButton?.enabled).toBe(false)
        screen.continueButton?.activate()
        screen.newButton?.activate()
        expect(told).toEqual(["new"])
    })

    test("a game kept → Continue available and tells it", () => {
        const { screen, told } = menu()
        screen.hasSave = true
        expect(screen.continueButton?.enabled).toBe(true)
        screen.continueButton?.activate()
        expect(told).toEqual(["continue"])
    })

    test("a game kept, New game → asked again, nothing started yet", () => {
        const { screen, told } = menu()
        screen.hasSave = true
        screen.newButton?.activate()
        expect(screen.confirming).toBe(true)
        expect(told).toEqual([])
    })

    test("asked again, yes → the new game starts", () => {
        const { screen, told } = menu()
        screen.hasSave = true
        screen.newButton?.activate()
        screen.yesButton?.activate()
        expect(told).toEqual(["new"])
        expect(screen.confirming).toBe(false)
    })

    test("asked again, no → back to the choice, nothing started", () => {
        const { screen, told } = menu()
        screen.hasSave = true
        screen.newButton?.activate()
        screen.noButton?.activate()
        expect(screen.confirming).toBe(false)
        expect(screen.newButton).not.toBeNull()
        expect(told).toEqual([])
    })

    test("shown again after a question → the question is gone", () => {
        const { screen } = menu()
        screen.hasSave = true
        screen.newButton?.activate()
        screen.visible = false
        screen.visible = true
        screen.frame()
        expect(screen.confirming).toBe(false)
    })

    test("the guide button → the guide is asked for", () => {
        const { screen, told } = menu()
        screen.guideButton?.activate()
        expect(told).toEqual(["guide"])
    })

    test("pictures that cannot be loaded → told, the menu still there", async() => {
        const { screen, told } = menu()
        await new Promise(resolve => setTimeout(resolve))
        expect(told.some(text => text.startsWith("report:"))).toBe(true)
        expect(screen.newButton).not.toBeNull()
    })
})
