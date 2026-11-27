import { describe, expect, test } from "vitest"
import { Toggle } from "@game/core-src/engine/ui/widget/Toggle"

import { uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

function click(setup: UiSetup, x: number, y: number): void {
    setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
    setup.port.send({ type: "pointer-up", button: 0, x, y })
    setup.frame()
}

// --- Tests ---

describe("Toggle", () => {
    test("clicked → turned over and told", () => {
        const setup = uiSetup()
        const toggle = new Toggle(setup.theme, "on")
        const told: boolean[] = []
        toggle.onChange = value => told.push(value)
        setup.main.content.add(toggle)
        setup.ui.render()
        click(setup, 2, 2)
        click(setup, 2, 2)
        expect(told).toEqual([true, false])
        expect(toggle.value).toBe(false)
    })

    test("its value set → shown with the pressed frame, nothing told", () => {
        const setup = uiSetup()
        const toggle = new Toggle(setup.theme, "on")
        let told = 0
        toggle.onChange = () => told++
        toggle.value = true
        expect(toggle.looks.normal).toBe(setup.theme.button.pressed)
        toggle.value = false
        expect(toggle.looks).toBe(setup.theme.button)
        expect(told).toBe(0)
    })

    test("made on → on from the start", () => {
        const setup = uiSetup()
        expect(new Toggle(setup.theme, "on", true).value).toBe(true)
    })
})
