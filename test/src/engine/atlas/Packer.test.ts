import { describe, expect, test } from "vitest"
import { Packer } from "@game/core"
import type { PackedRect, PackerOptions, PackerSize } from "@game/core"

// --- Fixture builders ---

const OPTIONS: PackerOptions = { maxSize: 256, padding: 1, initialSize: 64 }

function size(width: number, height = width): PackerSize {
    return { width, height }
}

/** Sizes from 1 to `max`, the same at every run. */
function sizesOf(count: number, max: number, seed = 1): PackerSize[] {
    let state = seed
    const next = (): number => {
        state = (state * 1103515245 + 12345) % 2147483648
        return 1 + state % max
    }
    return Array.from({ length: count }, () => size(next(), next()))
}

/** Where each rectangle is, its page by index. */
function layoutOf(packer: Packer, rects: readonly PackedRect[]): number[][] {
    return rects.map(rect => [packer.pages.indexOf(rect.page), rect.x, rect.y, rect.width, rect.height])
}

/** Do two rectangles of one page overlap once their padding is added? */
function overlap(a: PackedRect, b: PackedRect, padding: number): boolean {
    return a.page === b.page && a.x < b.x + b.width + padding && b.x < a.x + a.width + padding
        && a.y < b.y + b.height + padding && b.y < a.y + a.height + padding
}

function expectValid(packer: Packer, rects: readonly PackedRect[]): void {
    const { padding, maxSize } = packer.options
    for(const page of packer.pages){
        expect(page.width).toBeLessThanOrEqual(maxSize)
        expect(page.height).toBeLessThanOrEqual(maxSize)
    }
    rects.forEach((rect, index) => {
        expect(rect.x + rect.width).toBeLessThanOrEqual(rect.page.width)
        expect(rect.y + rect.height).toBeLessThanOrEqual(rect.page.height)
        for(const other of rects.slice(index + 1)) expect(overlap(rect, other, padding)).toBe(false)
    })
}

// --- Tests ---

describe("Packer.place", () => {
    test("same sequence → same layout", () => {
        const run = (): number[][] => {
            const packer = new Packer(OPTIONS)
            const rects = packer.place(sizesOf(80, 40))
            packer.remove(rects[3])
            packer.remove(rects[40])
            const later = packer.place(sizesOf(20, 30, 7))
            return layoutOf(packer, [...rects.filter((_, i) => i !== 3 && i !== 40), ...later])
        }
        expect(run()).toEqual(run())
    })

    test("many rectangles → no overlap, padding kept, inside pages and maxSize", () => {
        const packer = new Packer(OPTIONS)
        const batch = packer.place(sizesOf(200, 50))
        const singles = sizesOf(60, 30, 3).map(one => packer.place([one])[0])
        expectValid(packer, [...batch, ...singles])
    })

    test("batch → rectangles in the order of the sizes, largest placed first", () => {
        const packer = new Packer({ maxSize: 64, padding: 0, initialSize: 64 })
        const [small, large, wide] = packer.place([size(8), size(32), size(32, 16)])
        expect([small.width, large.width, wide.width]).toEqual([8, 32, 32])
        // The 32×32 is placed first, then the 32×16, which ties on the longest side and loses on area.
        expect([large.x, large.y]).toEqual([0, 0])
        expect([wide.x, wide.y]).toEqual([32, 0])
    })

    test("free room in a page → taken before any page grows", () => {
        const packer = new Packer({ maxSize: 128, padding: 0, initialSize: 32 })
        packer.place([size(32)])
        packer.place([size(16)])
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[64, 32]])
        const filler = packer.place([size(16)])[0]
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[64, 32]])
        // Both free spots leave no short leftover and 16 texels on the long side: the smallest y wins.
        expect([filler.x, filler.y]).toEqual([48, 0])
    })

    test("no room, a page can grow → it grows, shortest side first, no new page", () => {
        const packer = new Packer({ maxSize: 128, padding: 0, initialSize: 32 })
        packer.place([size(32)])
        packer.place([size(64)])
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[128, 64]])
    })

    test("no page can grow enough → a new page, grown to hold it", () => {
        const packer = new Packer({ maxSize: 64, padding: 0, initialSize: 16 })
        packer.place([size(40)])
        const second = packer.place([size(40)])[0]
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[64, 64], [64, 64]])
        expect(second.page).toBe(packer.pages[1])
    })

    test("a page grows straight to its final size within a batch", () => {
        const packer = new Packer({ maxSize: 1024, padding: 0, initialSize: 64 })
        const rects = packer.place(Array.from({ length: 16 }, () => size(128)))
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[512, 512]])
        expectValid(packer, rects)
    })

    test("the margin of the last column → not counted", () => {
        const packer = new Packer({ maxSize: 32, padding: 2, initialSize: 32 })
        const rects = packer.place([size(16), size(14)])
        expect(packer.pages.length).toBe(1)
        expect([rects[1].x, rects[1].y]).toEqual([18, 0])
    })

    test("larger than maxSize → throws naming it, nothing placed", () => {
        const packer = new Packer({ maxSize: 64, padding: 1, initialSize: 32 })
        expect(() => packer.place([size(8), size(65, 4)])).toThrow(/Item 1 of 2, 65×4/)
        expect(packer.pages.length).toBe(0)
    })

    test("maxSize itself → fits, padding included", () => {
        const packer = new Packer({ maxSize: 64, padding: 1, initialSize: 32 })
        packer.place([size(64)])
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[64, 64]])
    })

    test("not whole texels → throws", () => {
        expect(() => new Packer(OPTIONS).place([size(1.5, 2)])).toThrow(/whole/)
    })
})

describe("Packer.remove", () => {
    test("removed zone → reusable at once", () => {
        const packer = new Packer({ maxSize: 32, padding: 0, initialSize: 32 })
        const [, second] = packer.place([size(16), size(16), size(16), size(16)])
        packer.remove(second)
        const again = packer.place([size(16)])[0]
        expect([again.x, again.y]).toEqual([second.x, second.y])
        expect(packer.pages.length).toBe(1)
    })

    test("two neighbors removed → their union is one free rectangle", () => {
        const packer = new Packer({ maxSize: 32, padding: 0, initialSize: 32 })
        const [first, second] = packer.place([size(16), size(16), size(16), size(16)])
        packer.remove(first)
        packer.remove(second)
        const wide = packer.place([size(32, 16)])[0]
        expect([wide.x, wide.y]).toEqual([0, 0])
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[32, 32]])
    })

    test("last rectangle of a page → the page closes, the others stay", () => {
        const packer = new Packer({ maxSize: 32, padding: 0, initialSize: 32 })
        const [a, b] = packer.place([size(32), size(32)])
        const second = packer.pages[1]
        packer.remove(a)
        expect(packer.pages).toEqual([second])
        expect(b.page).toBe(second)
    })

    test("removed twice → throws", () => {
        const packer = new Packer(OPTIONS)
        const [rect] = packer.place([size(8)])
        packer.remove(rect)
        expect(() => packer.remove(rect)).toThrow(/not placed/)
    })
})

describe("Packer.sameLayoutAs", () => {
    test("same operations → true, one more → false", () => {
        const a = new Packer(OPTIONS)
        const b = new Packer(OPTIONS)
        const [ra] = a.place(sizesOf(30, 20))
        const [rb] = b.place(sizesOf(30, 20))
        a.remove(ra)
        b.remove(rb)
        expect(a.sameLayoutAs(b)).toBe(true)
        a.place([size(4)])
        expect(a.sameLayoutAs(b)).toBe(false)
    })

    test("another padding → false", () => {
        const a = new Packer(OPTIONS)
        const b = new Packer({ ...OPTIONS, padding: 0 })
        a.place(sizesOf(10, 20))
        b.place(sizesOf(10, 20))
        expect(a.sameLayoutAs(b)).toBe(false)
    })
})

describe("Packer options", () => {
    test("a side below 1, a fraction or a negative padding → throws", () => {
        expect(() => new Packer({ ...OPTIONS, maxSize: 0 })).toThrow(/not possible/)
        expect(() => new Packer({ ...OPTIONS, initialSize: 12.5 })).toThrow(/not possible/)
        expect(() => new Packer({ ...OPTIONS, padding: -1 })).toThrow(/not possible/)
    })

    test("initialSize above maxSize → cut down to it", () => {
        const packer = new Packer({ maxSize: 32, padding: 0, initialSize: 64 })
        packer.place([size(4)])
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[32, 32]])
    })
})

describe("Packer growth", () => {
    test("equal sides → the width doubles first, then the height", () => {
        const packer = new Packer({ maxSize: 256, padding: 0, initialSize: 16 })
        packer.place([size(16)])
        packer.place([size(16)])
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[32, 16]])
        packer.place([size(32, 16)])
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[32, 32]])
    })

    test("a maxSize that is no power of two → the last doubling stops at it", () => {
        const packer = new Packer({ maxSize: 48, padding: 0, initialSize: 32 })
        packer.place([size(32)])
        packer.place([size(16, 32)])
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[48, 32]])
    })

    test("the first page able to grow → chosen over a later one", () => {
        const packer = new Packer({ maxSize: 64, padding: 0, initialSize: 32 })
        packer.place([size(32), size(32), size(32), size(32), size(32)])
        // Page 0 is full at 64×64, page 1 holds one 32×32 at 32×32: only page 1 can grow.
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[64, 64], [32, 32]])
        const grown = packer.place([size(32)])[0]
        expect(grown.page).toBe(packer.pages[1])
        expect(packer.pages[1].width).toBe(64)
    })

    test("free room on two pages → the first page, even when the second fits better", () => {
        const packer = new Packer({ maxSize: 32, padding: 0, initialSize: 32 })
        packer.place([size(32, 16)])
        packer.place([size(32, 24)])
        // Page 0 has 32×16 free, page 1 exactly 32×8.
        const strip = packer.place([size(32, 8)])[0]
        expect(packer.pages.length).toBe(2)
        expect(strip.page).toBe(packer.pages[0])
    })

    test("rectangles placed before a growth → kept where they were", () => {
        const packer = new Packer({ maxSize: 512, padding: 1, initialSize: 32 })
        const before = packer.place(sizesOf(10, 12))
        const where = before.map(rect => [rect.x, rect.y])
        packer.place(sizesOf(40, 40, 5))
        expect(before.map(rect => [rect.x, rect.y])).toEqual(where)
        expect(packer.pages[0].width).toBeGreaterThan(32)
    })
})

describe("Packer padding", () => {
    test("a padding → neighbors kept that far apart", () => {
        const packer = new Packer({ maxSize: 64, padding: 3, initialSize: 64 })
        const [a, b] = packer.place([size(10), size(10)])
        expect(b.x - (a.x + a.width)).toBe(3)
    })

    test("a removal → the padding freed with the zone", () => {
        const packer = new Packer({ maxSize: 32, padding: 2, initialSize: 32 })
        const [first] = packer.place([size(15), size(15)])
        packer.remove(first)
        const again = packer.place([size(15)])[0]
        expect([again.x, again.y]).toEqual([0, 0])
        expect(packer.pages.length).toBe(1)
    })
})

describe("Packer lifecycle", () => {
    test("a page closed, then a new item → a new page at initialSize", () => {
        const packer = new Packer({ maxSize: 256, padding: 0, initialSize: 32 })
        const [big] = packer.place([size(100)])
        packer.remove(big)
        expect(packer.pages.length).toBe(0)
        packer.place([size(4)])
        expect(packer.pages.map(page => [page.width, page.height])).toEqual([[32, 32]])
    })

    test("a rectangle of another packer → throws, nothing changed", () => {
        const packer = new Packer(OPTIONS)
        packer.place([size(8)])
        const [foreign] = new Packer(OPTIONS).place([size(8)])
        expect(() => packer.remove(foreign)).toThrow(/not placed/)
        expect(packer.pages.length).toBe(1)
    })

    test("an empty batch → nothing placed, no page", () => {
        const packer = new Packer(OPTIONS)
        expect(packer.place([])).toEqual([])
        expect(packer.pages.length).toBe(0)
    })

    test("many removals and additions → still no overlap", () => {
        const packer = new Packer({ maxSize: 128, padding: 1, initialSize: 32 })
        let live = packer.place(sizesOf(60, 24))
        for(let round = 0; round < 5; round++){
            live.filter((_, i) => i % 3 === round % 3).forEach(rect => packer.remove(rect))
            live = live.filter((_, i) => i % 3 !== round % 3)
            live.push(...packer.place(sizesOf(20, 24, round + 11)))
        }
        expectValid(packer, live)
    })
})
