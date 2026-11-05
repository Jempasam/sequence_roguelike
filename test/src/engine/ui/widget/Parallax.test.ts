import { describe, expect, test } from "vitest"
import { Parallax, Sprite, Texture } from "@game/core"

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

    test("asks no size → takes what its stack gives", () => {
        const setup = uiSetup()
        const parallax = background(setup)
        expect([parallax.bounds.width, parallax.bounds.height]).toEqual([320, 180])
    })
})
