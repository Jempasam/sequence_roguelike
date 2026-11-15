import { describe, expect, test } from "vitest"
import type { PixelData } from "@game/core"
import {
    PNJ_ANIMATIONS, PixelArtActor, PixelArtPnj, bodyZoneOf, cutParts, itemSpotOf, pixelArtLayoutOf,
} from "@game/core/mecard/pnj"
import type { PixelArtTextures } from "@game/core/mecard/pnj"

// --- Fixture builders ---

/** A sprite from rows of text: `#` is opaque, anything else transparent. */
function spriteOf(...rows: string[]): PixelData {
    const width = rows[0].length
    const data = new Uint8Array(width * rows.length * 4)
    rows.forEach((row, y) => {
        for(let x = 0; x < width; x++){
            if(row[x] !== "#") continue
            data.set([200, 100, 50, 255], (y * width + x) * 4)
        }
    })
    return { width, height: rows.length, data }
}

/** A body 6 wide and 9 high, in a margin of transparent pixels. */
const BODY = spriteOf(
    "..........",
    "..######..",
    "..######..",
    "..######..",
    "..######..",
    "..######..",
    "..######..",
    "..######..",
    "..######..",
    "..######..",
    "..........",
)

/** The same body, a sword held out to its right: one pixel wide, touching it, as high as the body. */
const ARMED = spriteOf(
    "...........",
    "..######...",
    "..######..#",
    "..######..#",
    "..######..#",
    "..#########",
    "..######..#",
    "..######..#",
    "..######..#",
    "..######...",
    "...........",
)

/** How many pixels of an image are not transparent. */
function opaque(part: PixelData): number {
    return Array.from(part.data).filter((value, at) => at % 4 === 3 && value > 0).length
}

/** A character over a sprite, its textures not made: nothing here draws. */
function pnjOf(pixels: PixelData): PixelArtPnj {
    const textures = { top: {}, middle: {}, bottom: {} } as unknown as PixelArtTextures
    return new PixelArtPnj(pixelArtLayoutOf(pixels), textures)
}

type Point = { x: number, y: number }

function pointOf(run: (out: Point) => void): Point {
    const out = { x: 0, y: 0 }
    run(out)
    return out
}

// --- Tests ---

describe("bodyZoneOf", () => {
    test("a body alone → the box around it", () => {
        expect(bodyZoneOf(BODY)).toEqual({ x: 2, y: 1, width: 6, height: 9 })
    })

    test("a thin sword touching the body → left out of the zone", () => {
        const zone = bodyZoneOf(ARMED)
        expect(zone.x).toBe(2)
        expect(zone.width).toBe(6)
    })

    test("a transparent sprite → an error", () => {
        expect(() => bodyZoneOf(spriteOf("...", "..."))).toThrow(/transparent/)
    })
})

describe("itemSpotOf", () => {
    test("the rightmost column of the body, the pixel nearest its middle", () => {
        // Rows 2 to 5 are the body: the rightmost column holds pixels at rows 3 and 5, the middle is row 4.
        const sprite = spriteOf(
            "....",
            "....",
            "###.",
            "####",
            "###.",
            "####",
        )
        expect(itemSpotOf(sprite, { x: 0, y: 0, width: 4, height: 6 }, 2)).toEqual({ x: 3.5, y: 3.5 })
    })

    test("pixels over the row it starts from are not of the body", () => {
        const sprite = spriteOf(
            "####",
            "###.",
            "###.",
            "###.",
        )
        expect(itemSpotOf(sprite, { x: 0, y: 0, width: 4, height: 4 }, 1).x).toBe(2.5)
    })
})

describe("pixelArtLayoutOf", () => {
    const layout = pixelArtLayoutOf(BODY)

    test("the canvas is the box around the sprite, margin left out", () => {
        expect(layout.bounds).toEqual({ x: 2, y: 1, width: 6, height: 9 })
        expect(layout.width).toBe(6)
        expect(layout.height).toBe(9)
    })

    test("three parts, one over the other, filling the canvas", () => {
        expect(layout.top).toEqual({ x: 0, y: 0, width: 6, height: 3 })
        expect(layout.middle).toEqual({ x: 0, y: 3, width: 6, height: 3 })
        expect(layout.bottom).toEqual({ x: 0, y: 6, width: 6, height: 3 })
    })

    test("the body bends over its middle: from the top of its bottom, as high as its middle", () => {
        expect(layout.bendLine).toBe(6)
        expect(layout.band).toBe(3)
    })

    test("the hat on the top of the head, half as wide as the body, centered", () => {
        expect(layout.hatPlace.y).toBe(0)
        expect(layout.hatPlace.width).toBe(3)
        expect(layout.hatPlace.x + layout.hatPlace.width / 2).toBe(3)
    })

    test("the mask on its face, inside the top", () => {
        expect(layout.maskPlace.y).toBeGreaterThan(layout.top.y)
        expect(layout.maskPlace.y + layout.maskPlace.height).toBeLessThan(layout.top.y + layout.top.height)
    })

    test("the item held on the right of the body, its line centered on the spot", () => {
        // The right flank of the body under its top, the pixel of its column nearest the middle:
        // 5.5 and 5.5 in the canvas.
        const { itemPlace } = layout
        expect(itemPlace.x + itemPlace.width / 2).toBe(5.5)
        expect(itemPlace.y + itemPlace.height / 2).toBe(5.5)
    })

    test("accessories drawn to the width of the body", () => {
        expect(layout.accessoryPixel).toBeCloseTo(6 / 30)
    })

    test("a sprite under three rows high → an error", () => {
        expect(() => pixelArtLayoutOf(spriteOf("##", "##"))).toThrow(/3 pixels/)
    })
})

describe("cutParts", () => {
    test("each pixel in one part, the margin left out", () => {
        const { top, middle, bottom } = cutParts(BODY, pixelArtLayoutOf(BODY))
        expect([top, middle, bottom]).toMatchObject([
            { width: 6, height: 3 }, { width: 6, height: 3 }, { width: 6, height: 3 },
        ])
        expect([opaque(top), opaque(middle), opaque(bottom)]).toEqual([18, 18, 18])
    })

    test("a sword beside the body is kept, in the parts it crosses", () => {
        const { top, middle, bottom } = cutParts(ARMED, pixelArtLayoutOf(ARMED))
        expect(top.width).toBe(9)
        expect(opaque(top) + opaque(middle) + opaque(bottom)).toBe(6 * 9 + 7 + 2)
    })
})

describe("PixelArtPnj pose", () => {
    test("rest → the canvas, its origin between the feet", () => {
        const pnj = pnjOf(BODY)
        expect(pointOf(out => pnj.bodyPointInto(6, 4.5, out))).toEqual({ x: 3, y: -4.5 })
        expect(pointOf(out => pnj.bodyPointInto(3, 9, out))).toEqual({ x: 0, y: 0 })
    })

    test("a setting out of its range → an error", () => {
        const pnj = pnjOf(BODY)
        expect(() => { pnj.orientation = 1.1 }).toThrow(RangeError)
        expect(() => { pnj.lean = -1.1 }).toThrow(RangeError)
        expect(() => { pnj.squash = -0.1 }).toThrow(RangeError)
        pnj.lean = 1
        pnj.lean = -1
    })

    test("orientation -1 → mirrored, 0 → at its narrowest, never flat", () => {
        const pnj = pnjOf(BODY)
        pnj.orientation = -1
        expect(pointOf(out => pnj.bodyPointInto(6, 4.5, out)).x).toBe(-3)
        pnj.orientation = 0
        expect(pointOf(out => pnj.bodyPointInto(6, 4.5, out)).x).toBeCloseTo(3 * 0.35)
    })

    test("the bottom and the top are rigid, however it leans", () => {
        const pnj = pnjOf(BODY)
        pnj.lean = -1
        const distance = (from: Point, to: Point) => Math.hypot(to.x - from.x, to.y - from.y)
        const at = (y: number) => pointOf(out => pnj.bodyPointInto(3, y, out))
        const top = [at(0), at(2)]
        const bottom = [at(7), at(9)]
        expect(distance(top[0], top[1])).toBeCloseTo(2)
        expect(distance(bottom[0], bottom[1])).toBeCloseTo(2)
        // The bottom stays where it stands.
        expect(bottom[1]).toEqual({ x: 0, y: 0 })
    })

    test("the cut between the middle and the bottom → no jump", () => {
        const pnj = pnjOf(BODY)
        pnj.lean = 0.7
        const under = pointOf(out => pnj.bodyPointInto(1, 6.0001, out))
        const over = pointOf(out => pnj.bodyPointInto(1, 5.9999, out))
        expect(Math.hypot(under.x - over.x, under.y - over.y)).toBeLessThan(0.01)
    })

    test("squash lowers and widens it", () => {
        const pnj = pnjOf(BODY)
        pnj.squash = 1
        expect(pointOf(out => pnj.bodyPointInto(6, 0, out))).toEqual({ x: 3 * 1.35, y: -4.5 })
    })

    test("looking far to the right or the left → it faces that way, whole", () => {
        const pnj = pnjOf(BODY)
        expect(pnj.gazeAt(1000, 0).orientation).toBe(1)
        expect(pnj.gazeAt(-1000, 0).orientation).toBe(-1)
        expect(Math.abs(pnj.gazeAt(0, -1000).lean)).toBeGreaterThan(0)
    })

    test("the head point: the middle of the top, leaning with it", () => {
        const pnj = pnjOf(BODY)
        expect(pointOf(out => pnj.headPointInto(out))).toEqual({ x: 0, y: -7.5 })
        pnj.lean = -1
        expect(pointOf(out => pnj.headPointInto(out)).x).toBeGreaterThan(3)
    })

    test("accessories at rest: the hat on the top, the item along its line", () => {
        const pnj = pnjOf(BODY)
        expect(pnj.hat).toMatchObject({ x: 0, scaleX: 1, width: 3 })
        expect(pnj.hat.angle).toBeCloseTo(0)
        expect(pnj.hat.y).toBeCloseTo(-8.4)
        expect(pnj.item).toMatchObject({ scaleX: 1, width: 6 })
        expect(pnj.item.angle).toBeCloseTo(0)
    })

    test("leaning → the hat leans with the top, the item stays with the bottom", () => {
        const pnj = pnjOf(BODY)
        const item = { ...pnj.item }
        pnj.lean = -1
        expect(pnj.hat.angle).toBeCloseTo(Math.PI / 2)
        expect(pnj.item.angle).not.toBe(item.angle)
    })

    test("facing left → the object mirrored, never upside down", () => {
        const pnj = pnjOf(BODY)
        pnj.orientation = -1
        expect(pnj.item.scaleX).toBe(-1)
        expect(pnj.hat.scaleX).toBeLessThan(0)
    })
})

describe("PixelArtActor", () => {
    test("every animation, summed, stays in the ranges of the pose", () => {
        const pnj = pnjOf(BODY)
        const actor = new PixelArtActor(pnj)
        for(const animation of PNJ_ANIMATIONS) actor.play(animation)
        actor.look(500, -300)
        for(let step = 0; step < 200; step++) actor.update(0.05)
        expect(actor.playing).toEqual([])
        expect(pnj.squash).toBeGreaterThanOrEqual(0)
        expect(pnj.orientation).toBeGreaterThan(0)
    })

    test("looking at a point → it goes there over a moment", () => {
        const pnj = pnjOf(BODY)
        const actor = new PixelArtActor(pnj)
        actor.look(-1000, 0)
        actor.update(0.05)
        expect(pnj.orientation).toBeLessThan(1)
        expect(pnj.orientation).toBeGreaterThan(-1)
        for(let step = 0; step < 100; step++) actor.update(0.05)
        expect(pnj.orientation).toBeCloseTo(-1, 1)
    })
})
