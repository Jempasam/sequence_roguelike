import { describe, expect, test } from "vitest"
import { Box, Console, ConsoleView, Label } from "@game/core"
import type { Command, CommandContext } from "@game/core"

import { ADVANCE, uiSetup } from "../../fixtures/uiFixtures"
import type { UiSetup } from "../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A command doing nothing, to be offered by name. */
const NOTHING: Command<CommandContext, null> = {
    usage: "rien.", complete: () => [], parse: () => null, execute: () => {},
}

/** How wide the console is, in virtual pixels: room for a few names of 3 characters, not for all 20. */
const WIDTH = 100

/** A console view of 20 commands `c00` to `c19`, as wide as {@link WIDTH}. */
function view(setup = uiSetup()): ConsoleView<CommandContext> {
    const console = new Console<CommandContext>({ print: () => {} })
    for(let i = 0; i < 20; i++) console.register(`c${String(i).padStart(2, "0")}`, NOTHING)
    const shown = new ConsoleView(setup.theme, console)
    shown.resize(WIDTH, 100)
    return shown
}

/** Press and release a key in one frame. */
function tap(setup: UiSetup, code: string): void {
    setup.port.keyDown(code).keyUp(code)
    setup.frame()
}

/** The words on the row of suggestions, marks included. */
function rowOf(shown: ConsoleView<CommandContext>): string[] {
    const column = shown.content as Box
    const row = column.children[1] as Box
    return row.children.map(child => (child as Label).text)
}

/** How wide the row of suggestions is once laid out: each word, and the gaps between them. */
function widthOf(words: readonly string[]): number {
    return words.reduce((sum, word) => sum + [...word].length * ADVANCE, 0) + 4 * (words.length - 1)
}

// --- Tests ---

describe("ConsoleView suggestions", () => {
    test("more than fit → the first ones, then how many are left, within the width", () => {
        const row = rowOf(view())
        expect(row[0]).toBe("c00")
        expect(row.at(-1)).toMatch(/^… \+\d+$/)
        expect(widthOf(row)).toBeLessThanOrEqual(WIDTH - 8)
    })

    test("tab past the last shown → scrolled, the one chosen shown, a mark before", () => {
        const shown = view()
        for(let i = 0; i <= 12; i++) shown.cycle(false)
        const row = rowOf(shown)
        expect(row[0]).toBe("…")
        expect(row).toContain("[c12]")
        expect(widthOf(row)).toBeLessThanOrEqual(WIDTH - 8)
    })

    test("shift tab from the first → the last, shown, nothing left after", () => {
        const shown = view()
        shown.cycle(true)
        const row = rowOf(shown)
        expect(row.at(-1)).toBe("[c19]")
    })

    test("tab twice, then shift tab through the keyboard → the one before", () => {
        const setup = uiSetup()
        const shown = view(setup)
        setup.main.content.add(shown)
        setup.ui.render()
        shown.open()
        tap(setup, "Tab")
        tap(setup, "Tab")
        expect(rowOf(shown)).toContain("[c01]")
        setup.port.keyDown("ShiftLeft")
        setup.frame()
        tap(setup, "Tab")
        expect(rowOf(shown)).toContain("[c00]")
    })
})

describe("ConsoleView focus", () => {
    /** A console shown in the corner, open, its line focused, and how many times it closed. */
    function opened(setup: UiSetup): { readonly shown: ConsoleView<CommandContext>, closes(): number } {
        const shown = view(setup)
        let closes = 0
        shown.onClose = () => closes++
        setup.main.content.add(shown, { x: "start", y: "start" })
        setup.ui.render()
        shown.open()
        return { shown, closes: () => closes }
    }

    /** Click a point of the screen, in virtual pixels. */
    function click(setup: UiSetup, x: number, y: number): void {
        setup.port.send({ type: "pointer-down", button: 0, x, y }, { type: "pointer-up", button: 0, x, y })
        setup.frame()
    }

    test("a click outside → the line loses the focus, the console closes once", () => {
        const setup = uiSetup()
        const { shown, closes } = opened(setup)
        click(setup, 300, 170)
        expect(shown.visible).toBe(false)
        expect(closes()).toBe(1)
    })

    test("a click on the lines printed → the console stays open, the line typed into", () => {
        const setup = uiSetup()
        const { shown } = opened(setup)
        click(setup, 10, 10)
        expect(shown.visible).toBe(true)
        setup.port.send({ type: "text", text: "c0" })
        setup.frame()
        expect(rowOf(shown)[0]).toBe("c00")
        expect(rowOf(shown)).not.toContain("c10")
    })

    test("escape → closed once, the focus lost on the way not closing it again", () => {
        const setup = uiSetup()
        const { shown, closes } = opened(setup)
        tap(setup, "Escape")
        expect(shown.visible).toBe(false)
        expect(closes()).toBe(1)
    })
})
