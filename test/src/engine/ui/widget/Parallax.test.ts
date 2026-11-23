import { describe, expect, test } from "vitest"
import { Color, Parallax, Sprite, Texture, WARP_FLOOR, warpedSpans } from "@game/core"

import { uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A parallax of two layers, a far one and a near one, stretched over the main layer, laid out. */
function background(setup: UiSetup, size: [number, number] = [400, 240]): Parallax {
    const texture = new Texture(setup.gpu, ...size)
    const parallax = new Parallax([
        { sprite: Sprite.whole(texture), depth: 4 },
        { sprite: Sprite.whole(texture), depth: 30 },
    ])
    setup.main.content.add(parallax, { x: "stretch", y: "stretch" })
    setup.ui.render()
    return parallax
}

/** Move the pointer, let the interface tick, then draw. */
function pointAt(setup: UiSetup, x: number, y: number): void {
    setup.port.send({ type: "pointer-move", x, y })
    setup.frame()
    setup.ui.update(1 / 60)
    setup.ui.render()
}

// --- Tests ---

describe("Parallax", () => {
    test("declared opaque, the pointer moving → drawn again with no clear, and not declared → cleared", () => {
        const clears = (opaque: boolean): number => {
            const setup = uiSetup()
            const texture = new Texture(setup.gpu, 400, 240)
            const parallax = new Parallax([{ sprite: Sprite.whole(texture), depth: 30 }], { opaque })
            setup.main.content.add(parallax, { x: "stretch", y: "stretch" })
            setup.ui.render()
            const before = setup.fake.callsOf("clear").length
            pointAt(setup, 300, 20)
            return setup.fake.callsOf("clear").length - before
        }
        expect(clears(true)).toBe(0)
        expect(clears(false)).toBeGreaterThan(0)
    })

    test("the pointer going around → drawn within its bounds in debug, with no error", () => {
        const setup = uiSetup({ debug: true })
        background(setup)
        for(const [x, y] of [[0, 0], [319, 179], [160, 90], [0, 179]]){
            expect(() => pointAt(setup, x, y)).not.toThrow()
        }
    })

    test("a sprite smaller than the screen → stretched, drawn with no error", () => {
        const setup = uiSetup({ debug: true })
        background(setup, [100, 50])
        expect(() => pointAt(setup, 300, 20)).not.toThrow()
    })

    test("placed layers, past the bounds, small, out of them, tinted → drawn within its bounds in debug, with no error", () => {
        const setup = uiSetup({ debug: true })
        const parallax = new Parallax([
            { sprite: Sprite.whole(new Texture(setup.gpu, 200, 120)), depth: 4 },
            {
                sprite: Sprite.whole(new Texture(setup.gpu, 260, 150)),
                depth: 30,
                place: { x: -20, y: -10, width: 240, height: 140 },
            },
            {
                sprite: Sprite.whole(new Texture(setup.gpu, 20, 10)),
                depth: 50,
                place: { x: 120, y: 70, width: 20, height: 10 },
            },
            {
                sprite: Sprite.whole(new Texture(setup.gpu, 20, 10)),
                depth: 5,
                place: { x: 600, y: 50, width: 20, height: 10 },
            },
        ], { tint: new Color(0.2, 0.5, 1), viewport: { width: 200, height: 120 } })
        setup.main.content.add(parallax, { x: "stretch", y: "stretch" })
        setup.ui.render()
        for(const [x, y] of [[0, 0], [319, 179], [160, 90], [0, 179]]){
            expect(() => pointAt(setup, x, y)).not.toThrow()
        }
    })

    test("layers bending, a depth by axis or none, placed and fitted → drawn within its bounds in debug", () => {
        const setup = uiSetup({ debug: true })
        const parallax = new Parallax([
            { sprite: Sprite.whole(new Texture(setup.gpu, 200, 120)), depth: { x: 10, y: 3 }, warp: { x: 1, y: -0.5 } },
            {
                sprite: Sprite.whole(new Texture(setup.gpu, 263, 151)),
                depth: { x: 0, y: 20 },
                warp: { x: -2, y: 40 },
                place: { x: -20, y: -10, width: 240, height: 140 },
            },
            {
                sprite: Sprite.whole(new Texture(setup.gpu, 3, 2)),
                depth: 50,
                warp: { x: 0.3, y: 0 },
                place: { x: 120, y: 70, width: 20, height: 10 },
            },
        ], { warpStrips: 7, viewport: { width: 200, height: 120 } })
        setup.main.content.add(parallax, { x: "stretch", y: "stretch" })
        setup.ui.render()
        for(const [x, y] of [[0, 0], [319, 179], [160, 90], [0, 179], [319, 0]]){
            expect(() => pointAt(setup, x, y)).not.toThrow()
        }
    })

    test("strips not a whole number from 1 → an error", () => {
        expect(() => new Parallax([], { warpStrips: 0 })).toThrow()
        expect(() => new Parallax([], { warpStrips: 2.5 })).toThrow()
    })

    test("a placed layer with no viewport, or a viewport with no size → an error", () => {
        const setup = uiSetup()
        const placed = {
            sprite: Sprite.whole(new Texture(setup.gpu, 20, 10)),
            depth: 5,
            place: { x: 0, y: 0, width: 20, height: 10 },
        }
        expect(() => new Parallax([placed])).toThrow()
        expect(() => new Parallax([placed], { viewport: { width: 0, height: 10 } })).toThrow()
        expect(() => new Parallax([placed], { viewport: { width: 20, height: 10 } })).not.toThrow()
    })

    test("asks no size → takes what its stack gives", () => {
        const setup = uiSetup()
        const parallax = background(setup)
        expect([parallax.bounds.width, parallax.bounds.height]).toEqual([320, 180])
    })
})

describe("warpedSpans", () => {
    const sum = (spans: number[]) => spans.reduce((a, b) => a + b, 0)

    test("no power → even strips", () => {
        expect(warpedSpans(100, 5, 0)).toEqual([20, 20, 20, 20, 20])
    })

    test("a power → the total kept, the last strips widened; its opposite → the first ones", () => {
        const right = warpedSpans(100, 5, 0.5)
        const left = warpedSpans(100, 5, -0.5)
        expect(sum(right)).toBeCloseTo(100)
        expect(right[4]).toBeGreaterThan(right[0])
        expect(left).toEqual([...right].reverse())
    })

    test("a huge power → no strip thinner than the floor of its share", () => {
        const spans = warpedSpans(100, 5, 1000)
        expect(sum(spans)).toBeCloseTo(100)
        // The middle strip weighs 1, the first would weigh less than nothing: it weighs the floor.
        expect(spans[0] / spans[2]).toBeCloseTo(WARP_FLOOR)
    })

    test("one strip → the whole length, whatever the power", () => {
        expect(warpedSpans(42, 1, 3)).toEqual([42])
    })
})
