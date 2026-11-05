import { describe, expect, test } from "vitest"
import { Transition } from "@game/core"
import type { OraImage, OraLayer } from "@game/core"

import { uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

function layer(name: string, x: number, y: number, width: number, height: number): OraLayer {
    const pixels = { width, height, data: new Uint8Array(width * height * 4) }
    return { name, x, y, opacity: 1, visible: true, pixels }
}

/** The door: a wall rising over the canvas then zooming in, a door rising with it then sliding away. */
const DOOR: OraImage = {
    width: 50,
    height: 50,
    layers: [
        layer("door 0;1;1 0;0;1 m 1;0;1 1;0;1", 14, 15, 21, 35),
        layer("wall 0;1;1 0;0;1 m 0;0;1 0;0;4", 0, 0, 50, 50),
    ],
}

/** The door, stretched over the main layer, laid out. */
function door(setup: UiSetup, shrink = 1): Transition {
    const transition = Transition.fromImage(setup.gpu, DOOR, "door", shrink)
    setup.main.content.add(transition, { x: "stretch", y: "stretch" })
    setup.ui.render()
    return transition
}

/** Let the interface tick for a while, then draw. */
function run(setup: UiSetup, seconds: number, step = 1 / 60): void {
    for(let left = seconds; left > 1e-9; left -= step){
        setup.ui.update(Math.min(step, left))
        setup.ui.render()
    }
}

// --- Tests ---

describe("Transition", () => {
    test("built → hidden, still, holding no input", () => {
        const setup = uiSetup()
        const transition = door(setup)
        expect(transition.visible).toBe(false)
        expect(transition.playing).toBe(false)
        expect(setup.main.modal).toBe(false)
    })

    test("played → shown and modal, the middle then the end heard once, in order, then hidden", () => {
        const setup = uiSetup()
        const transition = door(setup)
        const heard: string[] = []
        transition.play({ duration: 1, onMiddle: () => heard.push("middle"), onEnd: () => heard.push("end") })
        expect(transition.visible).toBe(true)
        expect(setup.main.modal).toBe(true)
        run(setup, 0.3)
        expect(heard).toEqual([])
        run(setup, 0.1)
        expect(heard).toEqual(["middle"])
        run(setup, 0.7)
        expect(heard).toEqual(["middle", "end"])
        expect(transition.visible).toBe(false)
        expect(transition.progress).toBe(1)
        expect(setup.main.modal).toBe(false)
    })

    test("playing → a click over it consumed, none once it ended", () => {
        const setup = uiSetup()
        const transition = door(setup)
        transition.play({ duration: 0.5 })
        setup.port.send({ type: "pointer-down", x: 100, y: 100, button: 0 })
        expect(setup.frame().events.every(event => event.consumed)).toBe(true)
        setup.port.send({ type: "pointer-up", x: 100, y: 100, button: 0 })
        setup.frame()
        run(setup, 1)
        setup.port.send({ type: "pointer-down", x: 100, y: 100, button: 0 })
        expect(setup.frame().events.some(event => event.consumed)).toBe(false)
    })

    test("one tick passing the middle and the end → both heard, the middle first", () => {
        const setup = uiSetup()
        const transition = door(setup)
        const heard: string[] = []
        transition.play({ duration: 0.1, onMiddle: () => heard.push("middle"), onEnd: () => heard.push("end") })
        setup.ui.update(1)
        expect(heard).toEqual(["middle", "end"])
    })

    test("reversed → from the end to the start, the middle heard on the way", () => {
        const setup = uiSetup()
        const transition = door(setup)
        const heard: string[] = []
        transition.play({ duration: 3, reverse: true, onMiddle: () => heard.push("middle"), onEnd: () => heard.push("end") })
        expect(transition.progress).toBe(1)
        run(setup, 1.9)
        expect(heard).toEqual([])
        run(setup, 0.2)
        expect(heard).toEqual(["middle"])
        run(setup, 1)
        expect(heard).toEqual(["middle", "end"])
        expect(transition.progress).toBe(0)
    })

    test("played again while playing → goes on from where it stands, the former listeners dropped", () => {
        const setup = uiSetup()
        const transition = door(setup)
        const heard: string[] = []
        transition.play({ duration: 1, onMiddle: () => heard.push("first middle"), onEnd: () => heard.push("first end") })
        run(setup, 0.2)
        const reached = transition.progress
        transition.play({ duration: 1, reverse: true, onMiddle: () => heard.push("middle"), onEnd: () => heard.push("end") })
        expect(transition.progress).toBe(reached)
        run(setup, 0.3)
        expect(heard).toEqual(["end"])
    })

    test("a listener of the middle playing it again → takes it over", () => {
        const setup = uiSetup()
        const transition = door(setup)
        const heard: string[] = []
        transition.play({
            duration: 0.1,
            onMiddle: () => transition.play({ duration: 1, reverse: true, onEnd: () => heard.push("back") }),
            onEnd: () => heard.push("end"),
        })
        setup.ui.update(1)
        expect(heard).toEqual([])
        expect(transition.playing).toBe(true)
        setup.ui.update(1)
        expect(heard).toEqual(["back"])
    })

    test("stopped → hidden where it stands, no listener heard", () => {
        const setup = uiSetup()
        const transition = door(setup)
        const heard: string[] = []
        transition.play({ duration: 1, onEnd: () => heard.push("end") })
        run(setup, 0.5)
        transition.stop()
        run(setup, 1)
        expect(heard).toEqual([])
        expect(transition.visible).toBe(false)
    })

    test("a duration not above 0 → refused", () => {
        const setup = uiSetup()
        expect(() => door(setup).play({ duration: 0 })).toThrow()
    })

    test("played through on screens of several shapes → drawn within its bounds in debug, shrunk or not", () => {
        for(const [width, height, shrink] of [[320, 180, 1], [180, 320, 1], [320, 180, 3], [97, 61, 2]]){
            const setup = uiSetup({ debug: true }, width, height)
            const transition = door(setup, shrink)
            transition.play({ duration: 1 })
            expect(() => run(setup, 1.1, 1 / 30)).not.toThrow()
        }
    })
})
