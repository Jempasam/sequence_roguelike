import { describe, expect, test } from "vitest"
import { Box } from "@game/core-src/engine/ui/layout/Box"
import { Stack } from "@game/core-src/engine/ui/layout/Stack"
import type { Component } from "@game/core-src/engine/ui/Component"
import { Detail } from "@game/core/mecard/detail"
import { detailsOfParts } from "@game/core/mecard/detail-parts"

import { Probe, uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A container taking the pointer for itself, as an option of a choice does. */
class Option extends Stack {
    protected override get interactive(): boolean { return true }

    public override get holdsPointer(): boolean { return true }
}

interface Bench {
    readonly setup: UiSetup
    readonly option: Option
    readonly content: Box
    readonly a: Probe
    readonly b: Probe
    readonly plain: Probe
}

/** An option 60 wide holding a row of three parts: `a` (0..20), `b` (20..40) and `plain` (40..60). */
function bench(): Bench {
    const setup = uiSetup()
    const option = new Option()
    option.fixedSize = { width: 60, height: 20 }
    const content = new Box("row")
    const a = new Probe("a", [20, 20], { interactive: true })
    const b = new Probe("b", [20, 20], { interactive: true })
    const plain = new Probe("plain", [20, 20], { interactive: true })
    content.add(a)
    content.add(b)
    content.add(plain)
    option.add(content, { x: "start", y: "start" })
    setup.main.content.add(option, { offsetX: 0, offsetY: 0 })
    setup.ui.render()
    moveTo(setup, 200, 200)
    return { setup, option, content, a, b, plain }
}

function moveTo(setup: UiSetup, x: number, y: number): void {
    setup.port.send({ type: "pointer-move", x, y })
    setup.frame()
}

/** Each probe tells its name in capitals, except `plain`, which tells nothing. */
const textOf = (part: Component): string|null => {
    if(!(part instanceof Probe) || part.name === "plain") return null
    return part.name.toUpperCase()
}

// --- Tests ---

describe("detailsOfParts", () => {
    test("parts that tell → one detail each, in drawing order", () => {
        const { content } = bench()
        const details = detailsOfParts(content, textOf)
        expect(details).toHaveLength(2)
    })

    test("a part skipped → it has no detail", () => {
        const { content, a } = bench()
        expect(detailsOfParts(content, textOf, new Set([a]))).toHaveLength(1)
    })

    test("parts in an option taking the pointer → the pointer moving over them tells each", () => {
        const { setup, option, content } = bench()
        const detail = Detail.on(option, "option", detailsOfParts(content, textOf))
        const heard: string[] = []
        detail.listen({ onShow: shown => heard.push(String(shown.text)), onHide: () => heard.push("hide") })
        moveTo(setup, 5, 5)
        moveTo(setup, 25, 5)
        moveTo(setup, 45, 5)
        moveTo(setup, 200, 200)
        expect(heard).toEqual(["A", "B", "option", "hide"])
    })
})
