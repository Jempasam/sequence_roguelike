import { describe, expect, test } from "vitest"
import { ActionMap, key, mouse, NumberInput } from "@game/core"

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

// --- Tests ---

describe("NumberInput", () => {
    function numberField(setup: UiSetup): NumberInput {
        const input = new NumberInput(setup.theme, { min: 0, max: 10, step: 1, value: 3 })
        setup.main.content.add(input)
        setup.ui.render()
        input.field.focus()
        return input
    }

    test("a number committed → kept in the bounds", () => {
        const setup = uiSetup()
        const input = numberField(setup)
        setup.port.send({ type: "text", text: "5" })
        setup.frame()
        tap(setup, "Enter")
        expect(input.value).toBe(10)
        expect(input.field.text).toBe("10")
    })

    test("no number committed → the value from before, shown again", () => {
        const setup = uiSetup()
        const input = numberField(setup)
        tap(setup, "Backspace")
        tap(setup, "Enter")
        expect(input.value).toBe(3)
        expect(input.field.text).toBe("3")
    })

    test("up → one step more", () => {
        const setup = uiSetup()
        const input = numberField(setup)
        tap(setup, "ArrowUp")
        expect(input.value).toBe(4)
    })
})
