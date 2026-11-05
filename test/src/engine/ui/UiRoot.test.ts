import { describe, expect, test } from "vitest"
import { ActionMap, Box, Color, Gpu, key, Label, mouse, NineSlice, Panel, Rect, ScreenSurface, UiRoot } from "@game/core"
import type { InputFrame, Painter } from "@game/core"

import { fakeGfx, fakeGl } from "../../fixtures/fakeGl"
import { LINE, painted, Probe, ProbeStack, settle, uiSetup } from "../../fixtures/uiFixtures"
import type { UiSetup } from "../../fixtures/uiFixtures"

// --- Fixture builders ---

class MultiplyingProbe extends Probe {
    protected override paint(painter: Painter): void {
        painter.setBlend("multiply")
    }
}

function clearsOf(setup: ReturnType<typeof uiSetup>): number {
    return setup.fake.callsOf("clear").length
}

/** A rectangle, or the bounds of a component, as `[x, y, width, height]`. */
function boundsOf(of: Readonly<Rect>|{ bounds: Readonly<Rect> }): number[] {
    const { x, y, width, height } = "bounds" in of ? of.bounds : of
    return [x, y, width, height]
}

/** A gameplay table, to see what the interface left to the world. */
function gameplay(): ActionMap<"down"|"fire"|"forward", never> {
    return new ActionMap({
        buttons: { down: [key("ArrowDown")], fire: [mouse(0)], forward: [key("KeyZ")] },
        axes: {},
    })
}

/** Press and release a key in one frame, read by the interface then the gameplay. */
function tap(setup: UiSetup, code: string, world = gameplay()): ActionMap<"down"|"fire"|"forward", never> {
    setup.port.keyDown(code).keyUp(code)
    world.update(setup.frame())
    return world
}

function click(setup: UiSetup, x: number, y: number, world = gameplay()): InputFrame {
    setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
    setup.port.send({ type: "pointer-up", button: 0, x, y })
    const frame = setup.frame()
    world.update(frame)
    return frame
}

/** A menu: a column of two probes, then a row of two, all focusable. */
function menu(setup: UiSetup): Probe[] {
    const column = new Box("column")
    const row = new Box("row")
    const probes = ["f1", "f2", "f3", "f4"].map(name => new Probe(name, [10, 10], { focusable: true }))
    column.add(probes[0])
    column.add(probes[1])
    row.add(probes[2])
    row.add(probes[3])
    column.add(row)
    setup.main.content.add(column)
    setup.ui.render()
    return probes
}

// --- Tests ---

describe("UiRoot.render", () => {
    test("first render → everything drawn from a cleared texture", () => {
        const setup = uiSetup()
        setup.main.content.add(new Probe("a", [10, 10]))
        setup.ui.render()
        expect(painted).toEqual(["a"])
        expect(clearsOf(setup)).toBe(1)
    })

    test("nothing changed → nothing drawn again", () => {
        const setup = uiSetup()
        setup.main.content.add(new Probe("a", [10, 10]))
        settle(setup.ui)
        const clears = clearsOf(setup)
        setup.ui.render()
        expect(painted).toEqual([])
        expect(clearsOf(setup)).toBe(clears)
    })

    test("change in an opaque container → drawn from it, without clearing", () => {
        const setup = uiSetup()
        const panel = new ProbeStack("panel", true)
        const a = new Probe("a", [10, 10])
        const b = new Probe("b", [10, 10])
        panel.add(a)
        panel.add(b, { x: "end" })
        panel.fixedSize = { width: 50, height: 20 }
        setup.main.content.add(new Probe("far", [10, 10]), { x: "end", y: "end" })
        setup.main.content.add(panel)
        settle(setup.ui)
        const clears = clearsOf(setup)
        a.invalidate()
        setup.ui.render()
        expect(painted).toEqual(["panel", "a"])
        expect(clearsOf(setup)).toBe(clears)
    })

    test("nothing opaque around → drawn from the root, after a clear", () => {
        const setup = uiSetup()
        const a = new Probe("a", [10, 10])
        setup.main.content.add(a)
        settle(setup.ui)
        const clears = clearsOf(setup)
        a.invalidate()
        setup.ui.render()
        expect(painted).toEqual(["a"])
        expect(clearsOf(setup)).toBe(clears + 1)
    })

    test("under an opaque sibling covering it → nothing drawn", () => {
        const setup = uiSetup()
        const under = new Probe("under", [10, 10])
        setup.main.content.add(under, { offsetX: 10, offsetY: 10 })
        setup.main.content.add(new Probe("cover", [50, 50], { opaque: true }))
        settle(setup.ui)
        under.invalidate()
        setup.ui.render()
        expect(painted).toEqual([])
    })

    test("a sibling crossing part of it → drawn again after it", () => {
        const setup = uiSetup()
        const panel = new ProbeStack("panel", true)
        panel.fixedSize = { width: 60, height: 60 }
        const a = new Probe("a", [20, 20])
        panel.add(a, { offsetX: 10, offsetY: 10 })
        panel.add(new Probe("over", [20, 20]), { offsetX: 25, offsetY: 25 })
        setup.main.content.add(panel)
        settle(setup.ui)
        a.invalidate()
        setup.ui.render()
        expect(painted).toEqual(["panel", "a", "over"])
    })

    test("a layer above crossing it → drawn again after it", () => {
        const setup = uiSetup()
        const a = new Probe("a", [20, 20])
        setup.main.content.add(a)
        setup.popup.content.add(new Probe("pop", [20, 20]), { offsetX: 10, offsetY: 10 })
        settle(setup.ui)
        a.invalidate()
        setup.ui.render()
        expect(painted).toEqual(["a", "pop"])
    })

    test("in the opaque center of a nine-slice → no clear; on its transparent margin → a clear", () => {
        const setup = uiSetup()
        const white = setup.theme.white
        const frame = new NineSlice(white, { left: 1, top: 1, right: 1, bottom: 1 }, { opaqueCenter: true })
        const panel = new Panel(setup.theme, { background: frame, padding: 0 })
        const inner = new Box("column", { padding: 2 })
        const inside = new Probe("inside", [10, 10])
        const edge = new Probe("edge", [14, 1])
        inner.add(inside, { align: "center" })
        panel.content = inner
        setup.main.content.add(panel)
        setup.main.content.add(edge)
        settle(setup.ui)
        let clears = clearsOf(setup)
        inside.invalidate()
        setup.ui.render()
        expect(clearsOf(setup)).toBe(clears)
        clears = clearsOf(setup)
        edge.invalidate()
        setup.ui.render()
        expect(clearsOf(setup)).toBe(clears + 1)
    })

    test("label text changed → laid out and drawn again, its siblings untouched", () => {
        const setup = uiSetup()
        const box = new Box("column")
        box.fixedSize = { width: 100, height: 40 }
        const label = new Label(setup.theme, "hp 9")
        const other = new Probe("other", [10, 10])
        box.add(label)
        box.add(other)
        setup.main.content.add(box)
        settle(setup.ui)
        label.text = "hp 10"
        setup.ui.render()
        expect(boundsOf(label)).toEqual([0, 0, 100, LINE])
        expect(painted).toEqual([])
    })

    test("same text set again → nothing to do", () => {
        const setup = uiSetup()
        const label = new Label(setup.theme, "hp 9")
        setup.main.content.add(label)
        settle(setup.ui)
        const clears = clearsOf(setup)
        label.text = "hp 9"
        label.color = new Color(1, 1, 1)
        setup.ui.render()
        expect(clearsOf(setup)).toBe(clears)
    })

    test("a component hidden → its zone drawn again, without it", () => {
        const setup = uiSetup()
        const a = new Probe("a", [10, 10])
        setup.main.content.add(a)
        settle(setup.ui)
        const clears = clearsOf(setup)
        a.visible = false
        setup.ui.render()
        expect(painted).toEqual([])
        expect(clearsOf(setup)).toBe(clears + 1)
    })

    test("debug, a component drawing out of its bounds → refused", () => {
        const setup = uiSetup({ debug: true })
        setup.main.content.add(new Probe("leak", [10, 10], { overflow: 3 }), { offsetX: 20 })
        expect(() => setup.ui.render()).toThrow(/out of its bounds/)
    })

    test("debug, a redraw from an opaque component → cleared to magenta first", () => {
        const setup = uiSetup({ debug: true })
        const a = new Probe("a", [10, 10], { opaque: true })
        setup.main.content.add(a)
        settle(setup.ui)
        a.invalidate()
        setup.ui.render()
        const last = setup.fake.callsOf("clearColor").at(-1)
        expect(last?.args).toEqual([1, 0, 1, 1])
    })

    test("a blend multiplying → refused on the transparent texture", () => {
        const setup = uiSetup()
        setup.main.content.add(new MultiplyingProbe("multiply", [4, 4]))
        expect(() => setup.ui.render()).toThrow(/not "multiply"/)
    })
})

describe("UiRoot focus", () => {
    test("directions → the order of the tree, each container on its axis", () => {
        const setup = uiSetup()
        const [f1, f2, f3, f4] = menu(setup)
        tap(setup, "ArrowDown")
        expect(setup.ui.focused).toBe(f1)
        tap(setup, "ArrowDown")
        expect(setup.ui.focused).toBe(f2)
        tap(setup, "ArrowDown")
        expect(setup.ui.focused).toBe(f3)
        tap(setup, "ArrowRight")
        expect(setup.ui.focused).toBe(f4)
    })

    test("a direction at the end → left to the gameplay", () => {
        const setup = uiSetup()
        const [, , , f4] = menu(setup)
        tap(setup, "ArrowDown")
        f4.focus()
        const world = tap(setup, "ArrowDown")
        expect(setup.ui.focused).toBe(f4)
        expect(world.sample().pressed("down")).toBe(true)
    })

    test("a direction moving the focus → hidden from the gameplay", () => {
        const setup = uiSetup()
        menu(setup)
        tap(setup, "ArrowDown")
        expect(tap(setup, "ArrowDown").sample().pressed("down")).toBe(false)
    })

    test("next → every focusable in order, wrapping", () => {
        const setup = uiSetup()
        const [f1, , , f4] = menu(setup)
        f4.focus()
        tap(setup, "Tab")
        expect(setup.ui.focused).toBe(f1)
    })

    test("the focused one hidden → the focus moves to the next one", () => {
        const setup = uiSetup()
        const [, f2, f3] = menu(setup)
        f2.focus()
        f2.visible = false
        expect(setup.ui.focused).toBe(f3)
    })

    test("indicator → shown with the keyboard, hidden with the mouse", () => {
        const setup = uiSetup()
        menu(setup)
        tap(setup, "ArrowDown")
        expect(setup.ui.focusVisible).toBe(true)
        setup.port.send({ type: "pointer-move", x: 200, y: 100 })
        setup.frame()
        expect(setup.ui.focusVisible).toBe(false)
    })
})

describe("UiRoot pointer", () => {
    test("a click on an interactive component → consumed, the world sees nothing", () => {
        const setup = uiSetup()
        const probe = new Probe("p", [20, 20], { interactive: true })
        setup.main.content.add(probe, { offsetX: 10, offsetY: 10 })
        setup.ui.render()
        const world = gameplay()
        click(setup, 15, 12, world)
        expect(world.sample().pressed("fire")).toBe(false)
        expect(probe.events).toContain("pointer-down 5,2")
    })

    test("a click on an empty zone of a stack → the world sees it", () => {
        const setup = uiSetup()
        setup.main.content.add(new Probe("p", [20, 20], { interactive: true }))
        setup.ui.render()
        const world = gameplay()
        click(setup, 100, 100, world)
        expect(world.sample().pressed("fire")).toBe(true)
    })

    test("the scale → the pointer in virtual pixels", () => {
        const setup = uiSetup({ scale: 2 })
        const probe = new Probe("p", [20, 20], { interactive: true })
        setup.main.content.add(probe)
        setup.ui.render()
        click(setup, 31, 9)
        expect(probe.events).toContain("pointer-down 15,4")
    })
})

describe("UiRoot size", () => {
    test("follows a screen shrinking as well as growing", () => {
        const gfx = fakeGfx(fakeGl().gl, 640, 333)
        const gpu = new Gpu(gfx)
        const ui = new UiRoot(gpu, new ScreenSurface(gpu), { scale: 1 })
        ui.render()
        gfx.resize(419, 333)
        ui.render()
        expect([ui.width, ui.height]).toEqual([419, 333])
        gfx.resize(800, 200)
        ui.render()
        expect([ui.width, ui.height]).toEqual([800, 200])
    })
})
