import { describe, expect, test } from "vitest"
import { readTransition } from "@game/core"
import type { OraImage, OraLayer } from "@game/core"

// --- Fixture builders ---

/** A visible layer of a size, at a place, named. */
function layer(name: string, x = 0, y = 0, width = 10, height = 20, visible = true): OraLayer {
    const pixels = { width, height, data: new Uint8Array(width * height * 4) }
    return { name, x, y, opacity: 1, visible, pixels }
}

/** A canvas of 100×50 holding layers, the top one first. */
function painting(...layers: OraLayer[]): OraImage {
    return { width: 100, height: 50, layers }
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

// --- Tests ---

describe("readTransition", () => {
    test("a layer → its place and size in the space, its name, its frames with defaults", () => {
        const script = readTransition(painting(layer("door 0;1 0.5;0;2 1;-1;3;0.25", 20, 10, 10, 20)), "door")
        expect(script).toMatchObject({ aspect: 2, frameCount: 3, middle: 0.5 })
        expect(script.pictures[0]).toMatchObject({ name: "door", x: 0.2, y: 0.2, width: 0.1, height: 0.4 })
        expect(script.pictures[0].frames).toEqual([
            { x: 0, y: 1, scale: 1, opacity: 1 },
            { x: 0.5, y: 0, scale: 2, opacity: 1 },
            { x: 1, y: -1, scale: 3, opacity: 0.25 },
        ])
    })

    test("several layers → drawn from the bottom one, hidden ones left out", () => {
        const script = readTransition(painting(
            layer("top 0;0 1;1"), layer("notes", 0, 0, 1, 1, false), layer("bottom 0;0 0;0"),
        ), "two")
        expect(script.pictures.map(picture => picture.name)).toEqual(["bottom", "top"])
    })

    test("spaces repeated → ignored", () => {
        expect(readTransition(painting(layer("wall   0;1  0;0 ")), "spaces").frameCount).toBe(2)
    })

    test("m → the middle at the frame before it, the same on every layer that marks it", () => {
        const script = readTransition(painting(
            layer("door 0;1 0;0 m 1;0 1;0"), layer("wall 0;1 0;0 m 0;0 0;0;4"), layer("light 0;0 0;0 0;0 0;0"),
        ), "door")
        expect(script.middle).toBeCloseTo(1 / 3)
    })

    test("m after the last frame → the middle at the end", () => {
        expect(readTransition(painting(layer("a 0;0 1;1 m")), "end").middle).toBe(1)
    })

    test("m at different frames → refused, naming both layers", () => {
        const message = messageOf(() => readTransition(painting(layer("a 0;0 m 1;1 2;2"), layer("b 0;0 1;1 m 2;2")), "x"))
        expect(message).toContain("\"a\"")
        expect(message).toContain("\"b\"")
    })

    test("m first or twice → refused", () => {
        expect(messageOf(() => readTransition(painting(layer("a m 0;0 1;1")), "x"))).toContain("before its first")
        expect(messageOf(() => readTransition(painting(layer("a 0;0 m 1;1 m")), "x"))).toContain("twice")
    })

    test("a comma for a semicolon → refused, naming the layer and the frame", () => {
        const message = messageOf(() => readTransition(painting(layer("wall 0;1 0,0;4")), "door"))
        expect(message).toContain("wall 0;1 0,0;4")
        expect(message).toContain("\"0,0;4\"")
    })

    test("frames of the wrong shape → refused", () => {
        for(const frame of ["1", "1;2;3;0.5;1", "1;;2", "a;1", "0;0;-1", "0;0;1;2"]){
            expect(() => readTransition(painting(layer(`a 0;0 ${frame}`)), "x"), frame).toThrow()
        }
    })

    test("fewer than 2 frames → refused", () => {
        expect(messageOf(() => readTransition(painting(layer("a 0;0")), "x"))).toContain("1 frames")
        expect(() => readTransition(painting(layer("plain")), "x")).toThrow()
    })

    test("layers with different counts of frames → refused", () => {
        expect(() => readTransition(painting(layer("a 0;0 1;1"), layer("b 0;0 1;1 2;2")), "x")).toThrow("as many")
    })

    test("no visible layer → refused", () => {
        expect(() => readTransition(painting(), "x")).toThrow("no visible layer")
    })
})
