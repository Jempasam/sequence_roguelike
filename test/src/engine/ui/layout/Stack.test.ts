import { describe, expect, test } from "vitest"
import { Rect } from "@game/core"

import { Probe, uiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A rectangle, or the bounds of a component, as `[x, y, width, height]`. */
function boundsOf(of: Readonly<Rect>|{ bounds: Readonly<Rect> }): number[] {
    const { x, y, width, height } = "bounds" in of ? of.bounds : of
    return [x, y, width, height]
}

// --- Tests ---

describe("Stack", () => {
    test("anchors and offsets → corners, center and stretch", () => {
        const setup = uiSetup()
        const corner = new Probe("corner", [10, 10])
        const center = new Probe("center", [10, 10])
        const stretched = new Probe("stretched", [10, 10])
        setup.main.content.add(corner, { x: "end", y: "end", offsetX: 2, offsetY: 3 })
        setup.main.content.add(center, { x: "center", y: "center" })
        setup.main.content.add(stretched, { x: "stretch", y: "start", offsetX: 5 })
        setup.ui.render()
        expect(boundsOf(corner)).toEqual([308, 167, 10, 10])
        expect(boundsOf(center)).toEqual([155, 85, 10, 10])
        expect(boundsOf(stretched)).toEqual([5, 0, 310, 10])
    })
})
