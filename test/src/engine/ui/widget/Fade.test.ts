import { describe, expect, test } from "vitest"
import { Color, Fade } from "@game/core"

import { uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

/** A fade to red writing a word, stretched over the main layer, laid out. */
function fade(setup: UiSetup): Fade {
    const made = new Fade(setup.theme, new Color(1, 0, 0), "Porte")
    setup.main.content.add(made, { x: "stretch", y: "stretch" })
    setup.ui.render()
    return made
}

/** Let the interface tick for a while, then draw. */
function run(setup: UiSetup, seconds: number, step = 1 / 60): void {
    for(let left = seconds; left > 1e-9; left -= step){
        setup.ui.update(Math.min(step, left))
        setup.ui.render()
    }
}

describe("Fade", () => {
    test("built → hidden, still, holding no input", () => {
        const setup = uiSetup()
        const made = fade(setup)
        expect(made.visible).toBe(false)
        expect(made.playing).toBe(false)
        expect(setup.main.modal).toBe(false)
    })

    test("played → modal, the middle then the end heard once, in order, then hidden", () => {
        const setup = uiSetup()
        const made = fade(setup)
        const heard: string[] = []
        made.play({ duration: 1, onMiddle: () => heard.push("middle"), onEnd: () => heard.push("end") })
        expect(made.visible).toBe(true)
        expect(setup.main.modal).toBe(true)
        run(setup, 0.4)
        expect(heard).toEqual([])
        run(setup, 0.2)
        expect(heard).toEqual(["middle"])
        run(setup, 0.5)
        expect(heard).toEqual(["middle", "end"])
        expect(made.visible).toBe(false)
        expect(setup.main.modal).toBe(false)
    })

    test("played in reverse → the middle heard on the way back", () => {
        const setup = uiSetup()
        const made = fade(setup)
        const heard: string[] = []
        made.play({ duration: 1, reverse: true, onMiddle: () => heard.push("middle"), onEnd: () => heard.push("end") })
        run(setup, 0.6)
        expect(heard).toEqual(["middle"])
        run(setup, 0.5)
        expect(heard).toEqual(["middle", "end"])
    })

    test("a duration of 0 → refused", () => {
        const setup = uiSetup()
        expect(() => fade(setup).play({ duration: 0 })).toThrow()
    })
})
