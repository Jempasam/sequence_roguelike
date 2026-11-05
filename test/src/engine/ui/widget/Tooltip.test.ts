import { describe, expect, test } from "vitest"
import { ActionMap, key, mouse, Tooltip, TOOLTIP_DELAY } from "@game/core"

import { Probe, uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A gameplay table, to see what the interface left to the world. */
function gameplay(): ActionMap<"down"|"fire"|"forward", never> {
    return new ActionMap({
        buttons: { down: [key("ArrowDown")], fire: [mouse(0)], forward: [key("KeyZ")] },
        axes: {},
    })
}

/** Press and release a key in one frame, read by the interface then the gameplay. */
function tap(setup: UiSetup, code: string, world = gameplay()): ActionMap<"down"|"fire"|"forward", never> {
    setup.port.keyDown(code).keyUp(code)
    world.update(setup.frame())
    return world
}

// --- Tests ---

describe("Tooltip", () => {
    test("hovered → opened after the delay, closed when left", () => {
        const setup = uiSetup()
        const target = new Probe("target", [20, 20], { interactive: true })
        setup.main.content.add(target)
        setup.ui.render()
        const tooltip = new Tooltip(setup.ui, setup.popup, setup.theme)
        let built = 0
        tooltip.attach(target, () => {
            built++
            return new Probe("tip", [10, 10])
        })
        setup.port.send({ type: "pointer-move", x: 5, y: 5 })
        setup.frame()
        setup.ui.update(TOOLTIP_DELAY / 2)
        expect(setup.popup.isEmpty).toBe(true)
        setup.ui.update(TOOLTIP_DELAY / 2)
        expect(setup.popup.isEmpty).toBe(false)
        expect(built).toBe(1)
        setup.port.send({ type: "pointer-move", x: 200, y: 100 })
        setup.frame()
        setup.ui.update(0)
        expect(setup.popup.isEmpty).toBe(true)
    })

    test("focused with the keyboard → opened at once", () => {
        const setup = uiSetup()
        const target = new Probe("target", [20, 20], { focusable: true })
        setup.main.content.add(target)
        setup.ui.render()
        const tooltip = new Tooltip(setup.ui, setup.popup, setup.theme)
        tooltip.attach(target, () => new Probe("tip", [10, 10]))
        tap(setup, "ArrowDown")
        setup.ui.update(0)
        expect(setup.popup.isEmpty).toBe(false)
    })
})
