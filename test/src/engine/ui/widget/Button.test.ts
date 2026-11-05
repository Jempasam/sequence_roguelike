import { describe, expect, test } from "vitest"
import { ActionMap, Button, key, mouse } from "@game/core"
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

describe("Button", () => {
    test("pressed and released over it → activated", () => {
        const setup = uiSetup()
        const button = new Button(setup.theme, "ok")
        let activations = 0
        button.onActivate = () => activations++
        setup.main.content.add(button)
        setup.ui.render()
        click(setup, 2, 2)
        expect(activations).toBe(1)
    })

    test("pressed on it, released elsewhere → not activated, the release still its own", () => {
        const setup = uiSetup()
        const button = new Button(setup.theme, "ok")
        let activations = 0
        button.onActivate = () => activations++
        setup.main.content.add(button)
        setup.ui.render()
        setup.port.send({ type: "pointer-move", x: 2, y: 2 }, { type: "pointer-down", button: 0, x: 2, y: 2 })
        setup.frame()
        expect(button.pressed).toBe(true)
        setup.port.send({ type: "pointer-up", button: 0, x: 200, y: 100 })
        setup.frame()
        expect(button.pressed).toBe(false)
        expect(activations).toBe(0)
    })

    test("accept while focused → activated", () => {
        const setup = uiSetup()
        const button = new Button(setup.theme, "ok")
        let activations = 0
        button.onActivate = () => activations++
        setup.main.content.add(button)
        setup.ui.render()
        button.focus()
        tap(setup, "Enter")
        expect(activations).toBe(1)
    })
})
