import { describe, expect, test } from "vitest"
import { WrapBox } from "@game/core"

import { Probe, uiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A wrap box of a fixed width holding probes of 20×10, laid out. */
function wrapOf(width: number, count: number, gap = 0): { wrap: WrapBox, probes: Probe[] } {
    const setup = uiSetup()
    const wrap = new WrapBox({ gap })
    wrap.fixedSize = { width, height: 60 }
    const probes = Array.from({ length: count }, (_, index) => new Probe(`p${index}`, [20, 10]))
    for(const probe of probes) wrap.add(probe)
    setup.main.content.add(wrap, { x: "start", y: "start" })
    setup.ui.render()
    return { wrap, probes }
}

// --- Tests ---

describe("WrapBox", () => {
    test("children fitting one line → same row, the line centered in the width", () => {
        const { probes } = wrapOf(100, 2, 4)
        expect(probes.map(probe => probe.bounds.y)).toEqual([0, 0])
        expect(probes.map(probe => probe.bounds.x)).toEqual([28, 52])
    })

    test("children wider than the box → wrapped, each line centered", () => {
        const { probes } = wrapOf(50, 3, 2)
        expect(probes.map(probe => probe.bounds.y)).toEqual([0, 0, 12])
        expect(probes.map(probe => probe.bounds.x)).toEqual([4, 26, 15])
    })
})
