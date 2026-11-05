import { describe, expect, test } from "vitest"
import { ActionMap, key, mouse, TextInput } from "@game/core"

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

describe("TextInput", () => {
    test("text typed → in the field, its keys hidden from the gameplay", () => {
        const setup = uiSetup()
        const field = new TextInput(setup.theme)
        setup.main.content.add(field)
        setup.ui.render()
        field.focus()
        const world = gameplay()
        setup.port.keyDown("KeyZ").send({ type: "text", text: "zé" })
        world.update(setup.frame())
        expect(field.text).toBe("zé")
        expect(world.held("forward")).toBe(false)
    })

    test("backspace held → erased again at each repeat of the OS", () => {
        const setup = uiSetup()
        const field = new TextInput(setup.theme, { text: "abcd" })
        setup.main.content.add(field)
        setup.ui.render()
        field.focus()
        setup.port.keyDown("Backspace")
        setup.frame()
        setup.port.send({ type: "key-repeat", code: "Backspace" }, { type: "key-repeat", code: "Backspace" })
        setup.frame()
        expect(field.text).toBe("a")
    })

    test("ctrl backspace → the word before the cursor erased, then the spaces before it, all of them", () => {
        const setup = uiSetup()
        const field = new TextInput(setup.theme, { text: "hand  add Lancier" })
        setup.main.content.add(field)
        setup.ui.render()
        field.focus()
        setup.port.keyDown("ControlLeft")
        setup.frame()
        tap(setup, "Backspace")
        expect(field.text).toBe("hand  add ")
        tap(setup, "Backspace")
        expect(field.text).toBe("hand  add")
        tap(setup, "Backspace")
        expect(field.text).toBe("hand  ")
        setup.port.keyDown("Backspace")
        setup.frame()
        expect(field.text).toBe("hand")
        setup.port.send({ type: "key-repeat", code: "Backspace" })
        setup.frame()
        expect(field.text).toBe("")
    })

    test("ctrl delete → the word after the cursor erased, then the spaces after it", () => {
        const setup = uiSetup()
        const field = new TextInput(setup.theme, { text: "hand  add" })
        setup.main.content.add(field)
        setup.ui.render()
        field.focus()
        tap(setup, "Home")
        setup.port.keyDown("ControlLeft")
        setup.frame()
        tap(setup, "Delete")
        expect(field.text).toBe("  add")
        tap(setup, "Delete")
        expect(field.text).toBe("add")
    })

    test("enter held → committed once", () => {
        const setup = uiSetup()
        const field = new TextInput(setup.theme, { text: "ab" })
        const commits: string[] = []
        field.onCommit = text => commits.push(text)
        setup.main.content.add(field)
        setup.ui.render()
        field.focus()
        setup.port.keyDown("Enter")
        setup.frame()
        setup.port.send({ type: "key-repeat", code: "Enter" })
        setup.frame()
        expect(commits).toEqual(["ab"])
    })

    test("enter → committed; escape → the text of the last commit", () => {
        const setup = uiSetup()
        const field = new TextInput(setup.theme, { text: "ab" })
        const commits: string[] = []
        field.onCommit = text => commits.push(text)
        setup.main.content.add(field)
        setup.ui.render()
        field.focus()
        setup.port.send({ type: "text", text: "c" })
        setup.frame()
        tap(setup, "Enter")
        setup.port.send({ type: "text", text: "d" })
        setup.frame()
        tap(setup, "Escape")
        expect(commits).toEqual(["abc"])
        expect(field.text).toBe("abc")
    })

    test("selection with shift, then typed over", () => {
        const setup = uiSetup()
        const field = new TextInput(setup.theme, { text: "abcd" })
        setup.main.content.add(field)
        setup.ui.render()
        field.focus()
        setup.port.keyDown("ShiftLeft")
        setup.frame()
        tap(setup, "ArrowLeft")
        tap(setup, "ArrowLeft")
        setup.port.keyUp("ShiftLeft").send({ type: "text", text: "x" })
        setup.frame()
        expect(field.text).toBe("abx")
    })

    test("a filter and a length → refused at the typing", () => {
        const setup = uiSetup()
        const field = new TextInput(setup.theme, { maxLength: 3, accepts: character => character !== "b" })
        setup.main.content.add(field)
        setup.ui.render()
        field.focus()
        setup.port.send({ type: "text", text: "abcde" })
        setup.frame()
        expect(field.text).toBe("acd")
    })
})
