import { describe, expect, test } from "vitest"
import { decodePng, PngError } from "@game/core"
import type { PixelData } from "@game/core"

import { GREY, GREY_ALPHA, INDEXED, png, RGB, RGBA } from "../../fixtures/png"

// --- Fixture builders ---

function pixelsOf(image: PixelData): number[][] {
    const pixels: number[][] = []
    for(let i = 0; i < image.data.length; i += 4) pixels.push([...image.data.subarray(i, i + 4)])
    return pixels
}

function errorOf(run: () => unknown): PngError {
    try {
        run()
    } catch(error){
        if(error instanceof PngError) return error
        throw error
    }
    throw new Error("No PngError was thrown.")
}

// --- Tests ---

describe("decodePng", () => {
    test("grey 8-bit → RGBA, opaque", () => {
        const image = decodePng(png({ width: 2, height: 1, colorType: GREY, samples: [0, 200] }), "grey")
        expect(image).toMatchObject({ width: 2, height: 1 })
        expect(pixelsOf(image)).toEqual([[0, 0, 0, 255], [200, 200, 200, 255]])
    })

    test("grey 1-bit → 0 and 255", () => {
        const samples = [1, 0, 1, 1, 0, 0, 0, 0, 1, 1]
        const image = decodePng(png({ width: 10, height: 1, colorType: GREY, depth: 1, samples }), "grey1")
        expect(pixelsOf(image).map(p => p[0])).toEqual(samples.map(s => s * 255))
    })

    test("grey 2-bit, two rows → each row from its own first byte", () => {
        const samples = [0, 1, 2, 3, 3, 2, 1, 0, 1]
        const image = decodePng(png({ width: 3, height: 3, colorType: GREY, depth: 2, samples }), "grey2")
        expect(pixelsOf(image).map(p => p[0])).toEqual(samples.map(s => s * 85))
    })

    test("grey 4-bit → widened by 17", () => {
        const bytes = png({ width: 3, height: 1, colorType: GREY, depth: 4, samples: [0, 7, 15] })
        const image = decodePng(bytes, "grey4")
        expect(pixelsOf(image).map(p => p[0])).toEqual([0, 119, 255])
    })

    test("grey with tRNS → key color transparent", () => {
        const image = decodePng(png({
            width: 2, height: 1, colorType: GREY, samples: [5, 6], transparency: [0, 5],
        }), "keyed")
        expect(pixelsOf(image)).toEqual([[5, 5, 5, 0], [6, 6, 6, 255]])
    })

    test("grey and alpha → alpha kept", () => {
        const bytes = png({ width: 1, height: 1, colorType: GREY_ALPHA, samples: [90, 30] })
        const image = decodePng(bytes, "grey")
        expect(pixelsOf(image)).toEqual([[90, 90, 90, 30]])
    })

    test("RGB → opaque", () => {
        const image = decodePng(png({ width: 1, height: 1, colorType: RGB, samples: [10, 20, 30] }), "rgb")
        expect(pixelsOf(image)).toEqual([[10, 20, 30, 255]])
    })

    // Three pixels at least: fast-png 8 compares the three samples of the key to the number of pixels, and
    // refuses this valid tRNS on an RGB image of one or two pixels.
    test("RGB with tRNS → key color transparent", () => {
        const image = decodePng(png({
            width: 3, height: 1, colorType: RGB,
            samples: [1, 2, 3, 1, 2, 4, 1, 2, 3],
            transparency: [0, 1, 0, 2, 0, 3],
        }), "keyed")
        expect(pixelsOf(image)).toEqual([[1, 2, 3, 0], [1, 2, 4, 255], [1, 2, 3, 0]])
    })

    test("RGBA nearly transparent → color kept, not premultiplied", () => {
        const bytes = png({ width: 1, height: 1, colorType: RGBA, samples: [200, 100, 50, 1] })
        const image = decodePng(bytes, "rgba")
        expect(pixelsOf(image)).toEqual([[200, 100, 50, 1]])
    })

    test("palette 2-bit → entry colors, opaque", () => {
        const palette = [[255, 0, 0], [0, 255, 0], [0, 0, 255]] as const
        const image = decodePng(png({
            width: 3, height: 1, colorType: INDEXED, depth: 2, samples: [2, 0, 1], palette,
        }), "indexed")
        expect(pixelsOf(image)).toEqual([[0, 0, 255, 255], [255, 0, 0, 255], [0, 255, 0, 255]])
    })

    test("palette with a shorter tRNS → alpha of the listed entries, the others opaque", () => {
        const palette = [[1, 1, 1], [2, 2, 2], [3, 3, 3]] as const
        const image = decodePng(png({
            width: 3, height: 1, colorType: INDEXED, samples: [0, 1, 2], palette, transparency: [0, 128],
        }), "indexed")
        expect(pixelsOf(image)).toEqual([[1, 1, 1, 0], [2, 2, 2, 128], [3, 3, 3, 255]])
    })

    test("gAMA chunk → ignored, pixels as stored", () => {
        const gamma = Uint8Array.from([0, 0, 0x5b, 0x8e])
        const image = decodePng(png({
            width: 1, height: 1, colorType: RGB, samples: [128, 128, 128], chunks: [["gAMA", gamma]],
        }), "gamma")
        expect(pixelsOf(image)).toEqual([[128, 128, 128, 255]])
    })

    test("16-bit → unsupported, naming the image", () => {
        const error = errorOf(() => decodePng(png({
            width: 1, height: 1, colorType: RGB, depth: 16, samples: [1, 2, 3],
        }), "deep.png"))
        expect(error.reason).toBe("unsupported")
        expect(error.message).toContain("deep.png")
    })

    test("interlaced → unsupported, naming the image", () => {
        const error = errorOf(() => decodePng(png({
            width: 1, height: 1, colorType: GREY, samples: [0], interlaced: true,
        }), "adam7.png"))
        expect(error.reason).toBe("unsupported")
        expect(error.message).toContain("adam7.png")
    })

    test("not a PNG → invalid", () => {
        const error = errorOf(() => decodePng(new TextEncoder().encode("not a png at all, really not"), "text.png"))
        expect(error.reason).toBe("invalid")
        expect(error.message).toContain("text.png")
    })

    test("damaged byte → invalid", () => {
        const bytes = png({ width: 1, height: 1, colorType: RGB, samples: [1, 2, 3] })
        bytes[bytes.length - 20] ^= 0xff
        expect(errorOf(() => decodePng(bytes, "damaged.png")).reason).toBe("invalid")
    })

    test("palette index out of the palette → invalid", () => {
        const error = errorOf(() => decodePng(png({
            width: 1, height: 1, colorType: INDEXED, samples: [3], palette: [[0, 0, 0]],
        }), "short.png"))
        expect(error.reason).toBe("invalid")
    })
})
