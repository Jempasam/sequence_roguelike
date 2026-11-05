import { describe, expect, test } from "vitest"
import { ActionMap, ContextMenu, key, mouse } from "@game/core"
import type { InputFrame } from "@game/core"

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

function click(setup: UiSetup, x: number, y: number, world = gameplay()): InputFrame {
    setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
    setup.port.send({ type: "pointer-up", button: 0, x, y })
    const frame = setup.frame()
    world.update(frame)
    return frame
}

// --- Tests ---

describe("ContextMenu", () => {
    function opened(setup: UiSetup): { menu: ContextMenu, chosen: string[], before: Probe } {
        const before = new Probe("before", [10, 10], { focusable: true })
        setup.main.content.add(before)
        setup.ui.render()
        before.focus()
        const chosen: string[] = []
        const menu = new ContextMenu(setup.theme, setup.popup, [
            { label: "copy", action: () => chosen.push("copy") },
            { label: "cut", action: () => chosen.push("cut"), enabled: false },
            { label: "paste", action: () => chosen.push("paste") },
        ])
        menu.open({ x: 100, y: 50 })
        setup.ui.render()
        return { menu, chosen, before }
    }

    test("opened → modal, the focus on its first entry", () => {
        const setup = uiSetup()
        const { menu } = opened(setup)
        expect(setup.popup.modal).toBe(true)
        expect(menu.bounds.x).toBe(100)
        expect(setup.ui.focused?.parent?.parent).toBe(menu)
    })

    test("a press outside → closed, the focus given back", () => {
        const setup = uiSetup()
        const { menu, before } = opened(setup)
        click(setup, 300, 170)
        expect(menu.isOpen).toBe(false)
        expect(setup.ui.focused).toBe(before)
    })

    test("down past a disabled entry, accept → its action, then closed", () => {
        const setup = uiSetup()
        const { menu, chosen } = opened(setup)
        tap(setup, "ArrowDown")
        tap(setup, "Enter")
        expect(chosen).toEqual(["paste"])
        expect(menu.isOpen).toBe(false)
    })

    test("near the right edge → opened to the left of the point", () => {
        const setup = uiSetup()
        const { menu } = opened(setup)
        menu.open({ x: 318, y: 10 })
        setup.ui.render()
        expect(menu.bounds.x + menu.bounds.width).toBe(318)
    })
})
