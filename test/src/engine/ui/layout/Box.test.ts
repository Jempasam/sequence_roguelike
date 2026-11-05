import { describe, expect, test } from "vitest"
import { Box, Rect } from "@game/core"

import { Probe, uiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A rectangle, or the bounds of a component, as `[x, y, width, height]`. */
function boundsOf(of: Readonly<Rect>|{ bounds: Readonly<Rect> }): number[] {
    const { x, y, width, height } = "bounds" in of ? of.bounds : of
    return [x, y, width, height]
}

/** A row of fixed width with probes of the given minimum and preferred widths, laid out. */
function row(width: number, children: [number, number, number][]): Probe[] {
    const setup = uiSetup()
    const box = new Box("row")
    box.fixedSize = { width, height: 10 }
    const probes = children.map(([min, preferred], index) => new Probe(`p${index}`, [preferred, 10], { min: [min, 10] }))
    probes.forEach((probe, index) => box.add(probe, { grow: children[index][2] }))
    setup.main.content.add(box)
    setup.ui.render()
    return probes
}

// --- Tests ---

describe("Box", () => {
    test("room left → shared by grow, the rest of the rounding to the last growing", () => {
        const probes = row(100, [[10, 10, 1], [10, 10, 2], [10, 10, 0]])
        expect(probes.map(probe => probe.bounds.width)).toEqual([33, 57, 10])
        expect(probes.map(probe => probe.bounds.x)).toEqual([0, 33, 90])
    })

    test("room lacking → each shrinks toward its minimum, the sum exact", () => {
        const probes = row(70, [[10, 30, 0], [10, 30, 0], [10, 30, 0]])
        expect(probes.map(probe => probe.bounds.width)).toEqual([24, 24, 22])
    })

    test("below the minimums → each its minimum, the end overflowing", () => {
        const probes = row(20, [[10, 30, 0], [10, 30, 0], [10, 30, 0]])
        expect(probes.map(probe => probe.bounds.x)).toEqual([0, 10, 20])
        expect(probes.map(probe => probe.bounds.width)).toEqual([10, 10, 10])
    })

    test("column with gap, padding and alignment → placed across", () => {
        const setup = uiSetup()
        const box = new Box("column", { gap: 2, padding: 3, align: "center" })
        const a = new Probe("a", [10, 5])
        const b = new Probe("b", [20, 5])
        box.add(a)
        box.add(b, { align: "end" })
        setup.main.content.add(box)
        setup.ui.render()
        expect(boundsOf(box)).toEqual([0, 0, 26, 18])
        expect(boundsOf(a)).toEqual([8, 3, 10, 5])
        expect(boundsOf(b)).toEqual([3, 10, 20, 5])
    })
})
