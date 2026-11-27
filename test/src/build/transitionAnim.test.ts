import { describe, expect, test } from "vitest"
import { readTransition } from "@game/core-src/engine/ui/widget/TransitionScript"
import type { OraImage } from "@game/core-src/engine/image/decodeOra"
import { compileAnim } from "../../../scripts/transitionAnim.ts"
import type { AnimLayer, LayerTag } from "../../../scripts/transitionAnim.ts"

// --- Fixtures ---

const CANVAS = { width: 100, height: 50 }

/** A layer covering the whole canvas. */
function full(name: string, tag: LayerTag = "object"): AnimLayer {
    return { name, tag, x: 0, y: 0, width: 100, height: 50 }
}

/** A layer of a size at a place. */
function layer(name: string, x: number, y: number, width: number, height: number, tag: LayerTag = "object"): AnimLayer {
    return { name, tag, x, y, width, height }
}

function messageOf(run: () => unknown): string {
    try {
        run()
    } catch(error){
        if(error instanceof Error) return error.message
        throw error
    }
    throw new Error("No error was thrown.")
}

/** The frames of a layer name, as numbers. */
function framesOf(name: string): string[] {
    return name.split(" ").slice(1).filter(token => token !== "m")
}

// --- Tests ---

describe("compileAnim", () => {
    test("steps → frames in the engine name, the middle marked, the first step absolute then chained", () => {
        const result = compileAnim(["wall: y=0.2 a=0 > y=0 a=1 m > hold > z*2 a=0"], [full("wall")], CANVAS)
        expect(result.names).toEqual(["wall 0;0.2;1;0 0;0;1;1 m 0;0;1;1 0;0;2;0"])
    })

    test("relative operations chain from the step before", () => {
        const result = compileAnim(["a: x=0 y=0.3 a=0 > y-0.3 m > y-0.5 > y-0.5"], [full("a")], CANVAS)
        expect(framesOf(result.names[0])).toEqual(["0;0.3;1;0", "0;0;1;0", "0;-0.5;1;0", "0;-1;1;0"])
        expect(result.names[0]).toContain("0;0;1;0 m")
    })

    test("a name it writes is read back by the engine", () => {
        const result = compileAnim(["wall: y=0.2 a=0 > y-0.2 a=1 m > hold > a=0 z*4"], [full("wall")], CANVAS)
        const layerOf = { name: result.names[0], x: 0, y: 0, opacity: 1, visible: true, pixels: { width: 100, height: 50, data: new Uint8Array(100 * 50 * 4) } }
        const image: OraImage = { width: 100, height: 50, layers: [layerOf] }
        const script = readTransition(image, "test")
        expect(script.frameCount).toBe(4)
        expect(script.middle).toBeCloseTo(1 / 3)
    })

    test("repeat repeats a step, chained, and the middle comes after its last copy", () => {
        const result = compileAnim(["a: y=0 a=0 > a=1 m > y-0.1 repeat=3 > a=0"], [full("a")], CANVAS)
        expect(framesOf(result.names[0]).map(frame => frame.split(";")[1])).toEqual(["0", "0", "-0.1", "-0.2", "-0.3", "-0.3"])
    })

    test("an empty step or hold is the step before again", () => {
        const result = compileAnim(["a: a=0 > a=1 m > > a=0"], [full("a")], CANVAS)
        expect(framesOf(result.names[0])).toEqual(["0;0;1;0", "0;0;1;1", "0;0;1;1", "0;0;1;0"])
    })

    test("a layer left out holds still, following the global track", () => {
        const result = compileAnim(["global: a=0 > a=1 m > z*2 a=0"], [full("a"), full("b")], CANVAS)
        expect(framesOf(result.names[1])).toEqual(["0;0;1;0", "0;0;1;1", "0;0;2;0"])
    })

    test("the global zoom is around the center, a layer off-center moves away from it", () => {
        // A layer centered at (0.25, 0.5): a global zoom of 2 around (0.5, 0.5) puts its center at (0, 0.5).
        const result = compileAnim(["global: a=0 > a=1 m > z*2 a=0"], [layer("left", 0, 0, 50, 50)], CANVAS)
        expect(framesOf(result.names[0])[2]).toBe("-0.25;0;2;0")
    })

    test("on= centers the global zoom on a point or on a layer", () => {
        const layers = [full("back"), layer("door", 60, 10, 20, 30)]
        const byPoint = compileAnim(["global: a=0 > a=1 m > z*2 on=0.7;0.5 a=0"], layers, CANVAS)
        // door center is (0.7, 0.5): zooming around it keeps it still.
        expect(framesOf(byPoint.names[1])[2]).toBe("0;0;2;0")
        const byLayer = compileAnim(["global: a=0 > a=1 m > z*2 on=door a=0"], layers, CANVAS)
        expect(framesOf(byLayer.names[1])[2]).toBe("0;0;2;0")
        // The back layer, centered at (0.5, 0.5), moves away from (0.7, 0.5).
        expect(framesOf(byLayer.names[0])[2]).toBe("-0.2;0;2;0")
    })

    test("a pivot of a layer zooms it around that point", () => {
        const layers = [layer("a", 0, 0, 100, 50), layer("pin", 80, 20, 10, 10)]
        // pin center (0.85, 0.5); a zoomed by 2 around it goes to center 0.85 + 2*(0.5-0.85) = 0.15.
        const result = compileAnim(["a: a=0 > a=1 m > z*2 on=pin a=0", "pin: a=0 > m > a=0"], layers, CANVAS)
        expect(framesOf(result.names[0])[2]).toBe("-0.35;0;2;0")
    })

    test("a warning when the pivot changes while zoomed", () => {
        const result = compileAnim(
            ["global: a=0 > a=1 m > z*2 on=0.7;0.5 a=0.5 > on=0.2;0.5 a=0"], [full("a"), layer("b", 0, 0, 10, 10)], CANVAS)
        expect(result.warnings.find(warning => warning.key === "pivot-jump")?.severity).toBe("bug")
    })
})

describe("compileAnim errors", () => {
    test("a relative first step has nothing to relate to", () => {
        expect(messageOf(() => compileAnim(["a: y+0.2 > m > a=0"], [full("a")], CANVAS))).toContain("première étape est absolue")
        expect(messageOf(() => compileAnim(["a: hold > m > a=0"], [full("a")], CANVAS))).toContain("première étape est absolue")
    })

    test("tracks with different step counts, an unknown track, a track twice", () => {
        expect(messageOf(() => compileAnim(["a: a=0 > m > a=0", "b: a=0 > m"], [full("a"), full("b")], CANVAS))).toContain("autant d'étapes")
        expect(messageOf(() => compileAnim(["z: a=0 > m > a=0"], [full("a")], CANVAS))).toContain("n'est ni « global » ni un calque")
        expect(messageOf(() => compileAnim(["a: a=0 > m > a=0", "a: a=0 > m > a=0"], [full("a")], CANVAS))).toContain("deux fois")
    })

    test("a middle missing, at an end, or disagreed on", () => {
        expect(messageOf(() => compileAnim(["a: a=0 > a=1 > a=0"], [full("a")], CANVAS))).toContain("aucune piste")
        expect(messageOf(() => compileAnim(["a: a=1 m > a=1 > a=0"], [full("a")], CANVAS))).toContain("entrée avant et une sortie après")
        expect(messageOf(() => compileAnim(["a: a=0 > m > hold > a=0", "b: a=0 > hold > m > a=0"], [full("a"), full("b")], CANVAS))).toContain("marquent le milieu")
    })

    test("a layer moved or zoomed at the middle, the global too, opacity free", () => {
        expect(messageOf(() => compileAnim(["a: a=0 > y=0.1 m > a=0"], [full("a")], CANVAS))).toContain("pas à sa place peinte")
        expect(messageOf(() => compileAnim(["a: a=0 > z=2 m > a=0"], [full("a")], CANVAS))).toContain("pas à sa place peinte")
        expect(messageOf(() => compileAnim(["global: a=0 > z=2 m > a=0"], [full("a")], CANVAS))).toContain("« global » est décalée ou zoomée")
        expect(() => compileAnim(["a: a=0 > a=0.3 m > a=0"], [full("a")], CANVAS)).not.toThrow()
    })

    test("a layer seen at the start or the end", () => {
        expect(messageOf(() => compileAnim(["a: a=1 > m > a=0"], [full("a")], CANVAS))).toContain("encore visible au début")
        expect(messageOf(() => compileAnim(["a: a=0 > m > a=0.5"], [full("a")], CANVAS))).toContain("encore visible à la fin")
        // Out of the canvas counts as empty.
        expect(() => compileAnim(["a: y=2 > y=0 m > y=-2"], [full("a")], CANVAS)).not.toThrow()
    })

    test("unreadable operations and values out of range", () => {
        expect(messageOf(() => compileAnim(["a: foo > m > a=0"], [full("a")], CANVAS))).toContain("n'est pas une opération")
        expect(messageOf(() => compileAnim(["a: a=2 > m > a=0"], [full("a")], CANVAS))).toContain("hors de 0 à 1")
        expect(messageOf(() => compileAnim(["a: a=0 > m > z=-1"], [full("a")], CANVAS))).toContain("sous 0")
        expect(messageOf(() => compileAnim(["a: a=0 > on=zz m > a=0"], [full("a")], CANVAS))).toContain("doit être un calque")
    })
})

describe("compileAnim warnings", () => {
    const keys = (lines: string[], layers: AnimLayer[]) => compileAnim(lines, layers, CANVAS).warnings.map(warning => warning.key)

    test("every layer moving alike at every step is one big picture", () => {
        const lines = ["global: y=0.2 a=0 > y=0 a=1 m > z*2 a=0"]
        expect(keys(lines, [full("a"), full("b")])).toContain("simple-motion")
        // A single uniform segment among others is normal.
        const mixed = ["global: a=0 > a=1 m > z*2 a=0", "a: a=0 > a=1 m > y+0.5 a=0", "b: a=0 > a=1 m > a=0"]
        expect(keys(mixed, [full("a"), full("b")])).not.toContain("simple-motion")
    })

    test("an entrance or an exit that is only an equal fade", () => {
        const layers = [full("a"), full("b")]
        const fades = ["global: a=0 > a=1 m > hold > a=0", "a: a=0 > a=1 m > y+0.3 > hold"]
        expect(keys(fades, layers)).toContain("simple-fade-in")
        expect(keys(fades, layers)).toContain("simple-fade-out")
        expect(keys(["a: y=0.2 a=0 > y=0 a=1 m > y+0.3 > y+0.2 a=0"], [full("a")])).not.toContain("simple-fade-in")
    })

    test("a zoom with no point to zoom on", () => {
        const severity = (lines: string[]) => compileAnim(lines, [full("a")], CANVAS).warnings.find(warning => warning.key === "center-zoom")?.severity
        expect(severity(["a: a=0 > a=1 m > z*2 a=0"])).toBe("boring")
        expect(severity(["a: a=0 > a=1 m > z*2 on=0.3;0.3 a=0"])).toBeUndefined()
        expect(severity(["a: a=0 > a=1 m > y+0.5 a=0"])).toBeUndefined()
    })

    test("an edge of a border layer inside the canvas is seen", () => {
        const lines = ["a: y=0.2 a=0 > y=0 a=1 m > hold > a=0"]
        const found = (tag: LayerTag) => compileAnim(lines, [full("a", tag)], CANVAS).warnings.find(warning => warning.key === "visible-border")
        // Shifted by 0.2 while visible (a 0.5 on the way in), its top edge lies inside the canvas.
        const moving = ["a: y=0.2 a=0 > y=0.2 a=0.5 > y=0 a=1 m > hold > a=0"]
        expect(compileAnim(moving, [full("a", "border")], CANVAS).warnings.find(warning => warning.key === "visible-border")?.severity).toBe("bug")
        // An object is never checked, and a border invisible when shifted, or out of the canvas, is fine.
        expect(compileAnim(moving, [full("a", "object")], CANVAS).warnings.map(warning => warning.key)).not.toContain("visible-border")
        expect(found("border")).toBeUndefined()
        expect(keys(["a: y=2 a=1 > y=0 m > y=-2"], [full("a", "border")])).not.toContain("visible-border")
        // Zoomed in it covers more than the canvas: no edge inside.
        expect(keys(["global: a=0 > a=1 m > z*2 a=0"], [full("a", "border")])).not.toContain("visible-border")
    })

    test("the boxes of the layers opaque at the middle leave the canvas bare", () => {
        const half = layer("half", 0, 0, 100, 25)
        const result = compileAnim(["half: a=0 > a=1 m > a=0"], [half], CANVAS)
        expect(result.warnings.find(warning => warning.key === "uncovered")?.text).toContain("50.0 %")
        // A layer half opaque does not count, a full one does.
        expect(keys(["a: a=0 > a=0.5 m > a=0"], [full("a")])).toContain("uncovered")
        expect(keys(["a: a=0 > a=1 m > a=0"], [full("a")])).not.toContain("uncovered")
        // Two boxes together cover it.
        const both = ["a: a=0 > a=1 m > a=0", "b: a=0 > a=1 m > a=0"]
        expect(keys(both, [layer("a", 0, 0, 100, 30), layer("b", 0, 25, 100, 25)])).not.toContain("uncovered")
    })
})
