import { describe, expect, test } from "vitest"
import { RangeSlider } from "@game/core-src/engine/ui/widget/RangeSlider"

import { uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A range slider from 0 to 10, laid out in the main layer. */
function laid(setup: UiSetup, low = 2, high = 8): RangeSlider {
    const slider = new RangeSlider(setup.theme, {
        min: 0,
        max: 10,
        low,
        high,
    })
    setup.main.content.add(slider)
    setup.ui.render()
    return slider
}

function tap(setup: UiSetup, code: string): void {
    setup.port.keyDown(code).keyUp(code)
    setup.frame()
}

function press(setup: UiSetup, x: number): void {
    setup.port.send({ type: "pointer-move", x, y: 2 }, { type: "pointer-down", button: 0, x, y: 2 })
    setup.frame()
}

function drag(setup: UiSetup, x: number): void {
    setup.port.send({ type: "pointer-move", x, y: 2 })
    setup.frame()
}

function release(setup: UiSetup, x: number): void {
    setup.port.send({ type: "pointer-up", button: 0, x, y: 2 })
    setup.frame()
}

/** Where a value lies on the slider laid out, in virtual pixels: its thumb's middle. */
function xOf(setup: UiSetup, slider: RangeSlider, value: number): number {
    const thumb = setup.theme.slider.thumbWidth
    const travel = slider.bounds.width - thumb
    return slider.bounds.x + travel * (value - slider.min) / (slider.max - slider.min) + thumb / 2
}

// --- Tests ---

describe("RangeSlider", () => {
    test("bounds given off the steps or the range → snapped and kept within", () => {
        const setup = uiSetup()
        const slider = new RangeSlider(setup.theme, {
            min: 0,
            max: 1,
            step: 0.1,
            low: -3,
            high: 0.33,
        })
        expect([slider.low, slider.high]).toEqual([0, 0.3])
    })

    test("the low bound pushed past the high one → stops on it, and the other way", () => {
        const setup = uiSetup()
        const slider = laid(setup)
        slider.low = 9
        expect([slider.low, slider.high]).toEqual([8, 8])
        slider.high = 1
        expect([slider.low, slider.high]).toEqual([8, 8])
    })

    test("a change → heard once with both bounds; the same bounds → not heard", () => {
        const setup = uiSetup()
        const slider = laid(setup)
        const heard: [number, number][] = []
        slider.onChange = (low, high) => heard.push([low, high])
        slider.high = 6
        slider.high = 6
        expect(heard).toEqual([[2, 6]])
    })

    test("a press near each thumb → that one set there", () => {
        const setup = uiSetup()
        const slider = laid(setup)
        press(setup, xOf(setup, slider, 3))
        release(setup, xOf(setup, slider, 3))
        expect([slider.low, slider.high]).toEqual([3, 8])
        press(setup, xOf(setup, slider, 7))
        release(setup, xOf(setup, slider, 7))
        expect([slider.low, slider.high]).toEqual([3, 7])
    })

    test("a thumb dragged → only it follows, stopping on the other", () => {
        const setup = uiSetup()
        const slider = laid(setup)
        press(setup, xOf(setup, slider, 2))
        drag(setup, xOf(setup, slider, 5))
        expect([slider.low, slider.high]).toEqual([5, 8])
        drag(setup, xOf(setup, slider, 10))
        expect([slider.low, slider.high]).toEqual([8, 8])
        release(setup, xOf(setup, slider, 10))
    })

    test("left and right → the thumb touched last moved, the low one at first", () => {
        const setup = uiSetup()
        const slider = laid(setup)
        slider.focus()
        tap(setup, "ArrowRight")
        expect([slider.low, slider.high]).toEqual([3, 8])
        press(setup, xOf(setup, slider, 8))
        release(setup, xOf(setup, slider, 8))
        tap(setup, "ArrowLeft")
        expect([slider.low, slider.high]).toEqual([3, 7])
    })

    test("no range or no step → an error", () => {
        const setup = uiSetup()
        expect(() => new RangeSlider(setup.theme, { min: 1, max: 1 })).toThrow()
        expect(() => new RangeSlider(setup.theme, { min: 0, max: 1, step: 0 })).toThrow()
    })
})
