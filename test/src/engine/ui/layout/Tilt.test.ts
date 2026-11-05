import { describe, expect, test } from "vitest"
import { Tilt } from "@game/core"

import { Probe, uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A probe of 20 by 10 in a tilt of these limits, at the top left of the main layer, laid out. */
function tilted(setup: UiSetup, angle: number, scale: number): { tilt: Tilt, probe: Probe } {
    const probe = new Probe("card", [20, 10], { interactive: true })
    const tilt = new Tilt({ angle, scale })
    tilt.content = probe
    setup.main.content.add(tilt)
    setup.ui.render()
    return { tilt, probe }
}

/** Move the pointer to a point, then press there. */
function pressAt(setup: UiSetup, x: number, y: number): void {
    setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
    setup.frame()
}

// --- Tests ---

describe("Tilt", () => {
    test("limits → room around the content for the largest pose", () => {
        const setup = uiSetup()
        const { tilt, probe } = tilted(setup, 0, 2)
        expect([tilt.bounds.width, tilt.bounds.height]).toEqual([40, 20])
        expect([probe.bounds.x, probe.bounds.y]).toEqual([10, 5])
    })

    test("beyond its limits → an error", () => {
        const setup = uiSetup()
        const { tilt } = tilted(setup, 0.1, 1.2)
        expect(() => tilt.angle = 0.2).toThrow()
        expect(() => tilt.scale = 1.5).toThrow()
    })

    test("scaled ×2 → hit where drawn, outside where it was placed, the point told unposed", () => {
        const setup = uiSetup()
        const { tilt, probe } = tilted(setup, 0, 2)
        tilt.scale = 2
        setup.ui.render()
        // Placed from (10, 5) to (30, 15), drawn from (0, 0) to (40, 20) about the center (20, 10).
        pressAt(setup, 2, 2)
        expect(probe.events.at(-1)).toBe("pointer-down 1,1")
    })

    test("turned → drawn in debug with no error, though its content leaves its own bounds", () => {
        const setup = uiSetup({ debug: true })
        const { tilt } = tilted(setup, 0.3, 1.1)
        tilt.angle = 0.3
        tilt.scale = 1.1
        expect(() => setup.ui.render()).not.toThrow()
    })
})
