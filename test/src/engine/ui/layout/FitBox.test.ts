import { describe, expect, test } from "vitest"
import { FitBox, Rect } from "@game/core"

import { Probe, uiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A rectangle, or the bounds of a component, as `[x, y, width, height]`. */
function boundsOf(of: Readonly<Rect>|{ bounds: Readonly<Rect> }): number[] {
    const { x, y, width, height } = "bounds" in of ? of.bounds : of
    return [x, y, width, height]
}

// --- Tests ---

describe("FitBox", () => {
    test("integer mode → the largest whole multiple, centered", () => {
        const setup = uiSetup()
        const fit = new FitBox({ mode: "integer", width: 16, height: 16 })
        fit.fixedSize = { width: 50, height: 40 }
        const content = new Probe("content", [16, 16])
        fit.content = content
        setup.main.content.add(fit)
        setup.ui.render()
        expect(fit.scale).toBe(2)
        expect(boundsOf(content)).toEqual([9, 4, 32, 32])
    })
})
