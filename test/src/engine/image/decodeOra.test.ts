import { strToU8, zipSync } from "fflate"
import { describe, expect, test } from "vitest"
import { decodeOra, OraError } from "@game/core"

import { png, RGBA } from "../../fixtures/png"

// --- Fixture builders ---

/** A red pixel, as a PNG. */
const RED = png({ width: 1, height: 1, colorType: RGBA, samples: [255, 0, 0, 255] })

function ora(stack: string, files: Record<string, Uint8Array> = { "data/a.png": RED }): Uint8Array {
    return zipSync({ mimetype: strToU8("image/openraster"), "stack.xml": strToU8(stack), ...files })
}

function errorOf(run: () => unknown): OraError {
    try {
        run()
    } catch(error){
        if(error instanceof OraError) return error
        throw error
    }
    throw new Error("No OraError was thrown.")
}

// --- Tests ---

describe("decodeOra", () => {
    test("one layer → its name, place, opacity and pixels", () => {
        const image = decodeOra(ora(`<image w="10" h="20"><stack>
            <layer src="data/a.png" name="head &amp; hat" x="3" y="4" opacity="0.5" visibility="hidden" />
        </stack></image>`), "one")
        expect(image).toMatchObject({ width: 10, height: 20 })
        expect(image.layers).toHaveLength(1)
        expect(image.layers[0]).toMatchObject({ name: "head & hat", x: 3, y: 4, opacity: 0.5, visible: false })
        expect([...image.layers[0].pixels.data]).toEqual([255, 0, 0, 255])
    })

    test("several layers → top first, defaults for missing attributes", () => {
        const image = decodeOra(ora(`<image w="1" h="1"><stack>
            <layer src="data/a.png" name="top"/><layer src="data/b.png" name="bottom"/>
        </stack></image>`, { "data/a.png": RED, "data/b.png": RED }), "two")
        expect(image.layers.map(layer => layer.name)).toEqual(["top", "bottom"])
        expect(image.layers[1]).toMatchObject({ x: 0, y: 0, opacity: 1, visible: true })
    })

    test("not a zip → invalid", () => {
        expect(errorOf(() => decodeOra(new Uint8Array([1, 2, 3]), "junk")).reason).toBe("invalid")
    })

    test("layer file missing → invalid", () => {
        const bytes = ora(`<image w="1" h="1"><stack><layer src="data/x.png" name="x"/></stack></image>`)
        expect(errorOf(() => decodeOra(bytes, "missing")).reason).toBe("invalid")
    })

    test("nested stack → unsupported", () => {
        const bytes = ora(`<image w="1" h="1"><stack><stack><layer src="data/a.png"/></stack></stack></image>`)
        expect(errorOf(() => decodeOra(bytes, "nested")).reason).toBe("unsupported")
    })
})
