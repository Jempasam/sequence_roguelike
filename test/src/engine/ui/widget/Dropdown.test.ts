import { describe, expect, test } from "vitest"
import { Dropdown } from "@game/core"

import { uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

const OPTIONS = [
    { id: "a", label: "alpha" },
    { id: "b", label: "beta" },
    { id: "c", label: "gamma" },
]

function click(setup: UiSetup, x: number, y: number): void {
    setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
    setup.port.send({ type: "pointer-up", button: 0, x, y })
    setup.frame()
}

function tap(setup: UiSetup, code: string): void {
    setup.port.keyDown(code).keyUp(code)
    setup.frame()
}

/** A dropdown on the main layer, laid out. */
function made(setup: UiSetup): Dropdown {
    const dropdown = new Dropdown(setup.theme, setup.popup, OPTIONS)
    setup.main.content.add(dropdown)
    setup.ui.render()
    return dropdown
}

// --- Tests ---

describe("Dropdown", () => {
    test("made → shows the label of the first option", () => {
        const setup = uiSetup()
        const dropdown = new Dropdown(setup.theme, setup.popup, OPTIONS)
        expect(dropdown.selected).toBe("a")
        expect(dropdown.text).toBe("alpha")
    })

    test("clicked → its menu opens under it", () => {
        const setup = uiSetup()
        const dropdown = made(setup)
        click(setup, 2, 2)
        expect(dropdown.isOpen).toBe(true)
        expect(setup.popup.modal).toBe(true)
    })

    test("an option chosen from the menu → shown, told, the menu closed", () => {
        const setup = uiSetup()
        const dropdown = made(setup)
        const told: string[] = []
        dropdown.onSelect = id => told.push(id)
        click(setup, 2, 2)
        tap(setup, "ArrowDown")
        tap(setup, "Enter")
        expect(told).toEqual(["b"])
        expect(dropdown.selected).toBe("b")
        expect(dropdown.text).toBe("beta")
        expect(dropdown.isOpen).toBe(false)
    })

    test("the option already selected chosen → nothing told", () => {
        const setup = uiSetup()
        const dropdown = made(setup)
        let told = 0
        dropdown.onSelect = () => told++
        click(setup, 2, 2)
        tap(setup, "Enter")
        expect(told).toBe(0)
    })

    test("selected set → shown, nothing told", () => {
        const setup = uiSetup()
        const dropdown = made(setup)
        let told = 0
        dropdown.onSelect = () => told++
        dropdown.selected = "c"
        expect(dropdown.text).toBe("gamma")
        expect(told).toBe(0)
    })

    test("an id that is no option → refused", () => {
        const setup = uiSetup()
        const dropdown = made(setup)
        expect(() => { dropdown.selected = "z" }).toThrow()
    })

    test("options replaced without the selected one → the first one is selected", () => {
        const setup = uiSetup()
        const dropdown = made(setup)
        dropdown.selected = "c"
        dropdown.options = [{ id: "x", label: "xi" }, { id: "y", label: "psi" }]
        expect(dropdown.selected).toBe("x")
        expect(dropdown.text).toBe("xi")
    })
})
