import { describe, expect, test } from "vitest"
import { ActionMap, key, mouse, Slider } from "@game/core"
import type { InputFrame } from "@game/core"

import { uiSetup } from "../../../fixtures/uiFixtures"
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

function click(setup: UiSetup, x: number, y: number, world = gameplay()): InputFrame {
    setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
    setup.port.send({ type: "pointer-up", button: 0, x, y })
    const frame = setup.frame()
    world.update(frame)
    return frame
}

// --- Tests ---

describe("Slider", () => {
    test("right → one step more; a click → the value under the pointer", () => {
        const setup = uiSetup()
        const slider = new Slider(setup.theme, { min: 0, max: 10, step: 1, value: 5 })
        setup.main.content.add(slider)
        setup.ui.render()
        slider.focus()
        tap(setup, "ArrowRight")
        expect(slider.value).toBe(6)
        click(setup, 42, 2)
        expect(slider.value).toBe(10)
    })
})
