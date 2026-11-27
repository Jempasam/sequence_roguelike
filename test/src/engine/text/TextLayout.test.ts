import { describe, expect, test } from "vitest"
import { Color } from "@game/core-src/engine/math/Color"
import { TextLayout } from "@game/core-src/engine/text/TextLayout"
import { spansOf } from "@game/core-src/semantic/Text"
import type { Painter } from "@game/core-src/engine/gpu/Painter"
import type { Sprite } from "@game/core-src/engine/gpu/Sprite"

import { ADVANCE, LINE, testTheme, uiSetup } from "../../fixtures/uiFixtures"

// --- Tests ---

describe("TextLayout", () => {
    const layout = () => new TextLayout(testTheme(uiSetup().gpu).font)

    test("width → advance per character, line breaks count nothing", () => {
        expect(layout().widthOf("ab\nc")).toBe(3 * ADVANCE)
    })

    test("lines → cut at the spaces, then inside a word too long", () => {
        expect(layout().lines("ab cd efghij", 4 * ADVANCE)).toEqual(["ab", "cd", "efgh", "ij"])
    })

    test("outlined, a thickness → its copies that far around the text, the text last", () => {
        const drawn: number[][] = []
        const painter = {
            setTint(): void {},
            sprite(_sprite: Sprite, x: number, y: number): void {
                drawn.push([x, y])
            },
        } as unknown as Painter
        layout().drawOutlined(painter, "a", 10, 10, new Color(1, 1, 1), new Color(0, 0, 0), 2)
        const xs = drawn.map(([x]) => x)
        expect(drawn).toHaveLength(9)
        expect(Math.max(...xs) - Math.min(...xs)).toBe(4)
        expect(drawn[8][0] - Math.min(...xs)).toBe(2)
    })

    test("contrasted, one piece outlined → its copies around that piece only, all before the text", () => {
        const black = new Color(0, 0, 0)
        const drawn: { x: number, outlined: boolean }[] = []
        let tint: Color|null = null
        const painter = {
            setTint(color: Color): void { tint = color },
            sprite(_sprite: Sprite, x: number): void { drawn.push({ x, outlined: tint === black }) },
        } as unknown as Painter
        const white = [1, 1, 1] as const
        const spans = spansOf(["ab", { color: white, text: "cd" }, "ef"])
        layout().drawSpansContrasted(painter, spans, 10, 10, new Color(0.5, 0.5, 0.5), span => {
            return span.kind === "string" && span.color ? black : null
        })
        const outlines = drawn.filter(each => each.outlined)
        const first = 10 + 2 * ADVANCE
        expect(outlines).toHaveLength(8 * 2)
        expect(Math.min(...outlines.map(each => each.x))).toBe(first - 1)
        expect(Math.max(...outlines.map(each => each.x))).toBe(first + ADVANCE + 1)
        expect(drawn.slice(0, 16).every(each => each.outlined)).toBe(true)
        expect(drawn.slice(16).some(each => each.outlined)).toBe(false)
        expect(drawn).toHaveLength(16 + 6)
    })

    test("contrasted, no piece outlined → drawn as plain pieces are", () => {
        const drawn: number[] = []
        const painter = {
            setTint(): void {},
            sprite(_sprite: Sprite, x: number): void { drawn.push(x) },
        } as unknown as Painter
        layout().drawSpansContrasted(painter, spansOf(["abc"]), 0, 0, new Color(1, 1, 1), () => null)
        expect(drawn).toHaveLength(3)
    })

    test("fit → the start that fits, then the ellipsis", () => {
        expect(layout().fit("abcdef", 4 * ADVANCE)).toBe("abc…")
        expect(layout().fit("ab", 4 * ADVANCE)).toBe("ab")
    })

    test("span lines → cut at the spaces across colors, each run of a color one piece", () => {
        const red = [1, 0, 0] as const
        const lines = layout().spanLines(spansOf(["ab ", { color: red, text: "c" }, "d ef"]), 4 * ADVANCE)
        expect(lines.map(line => line.map(span => span.kind === "string" ? span.text : "#"))).toEqual([
            ["ab"], ["c", "d"], ["ef"],
        ])
    })

    test("span lines → a picture as wide as a line is tall, never cut", () => {
        const heart = { svg: "M0 0 L1 0 L0 1 Z", size: 1 }
        const text = layout()
        expect(text.spansWidth(spansOf(["a", heart]))).toBe(ADVANCE + LINE)
        expect(text.spanLines(spansOf([heart, heart]), LINE)).toHaveLength(2)
    })

    test("a picture of the text → as wide as it is, none while it has none, never cut", () => {
        const sprite = { width: 5, height: 7 } as Sprite
        const shelf = { of: (key: string) => key === "heart" ? { sprite, tinted: true } : null }
        const heart = { kind: "picture", picture: { picture: "heart" }, color: null, link: null } as const
        const lost = { kind: "picture", picture: { picture: "lost" }, color: null, link: null } as const
        const text = new TextLayout(testTheme(uiSetup().gpu).font, 1, shelf)
        expect(text.spansWidth([heart])).toBe(5)
        expect(text.spansWidth([lost])).toBe(0)
        expect(text.spanLines([heart, heart], 5)).toHaveLength(2)
    })

    test("a picture drawn → centered on the line, in the tint of the text when it takes it, else white", () => {
        const sprite = { width: 5, height: 5 } as Sprite
        const shelf = {
            of: (key: string) => ({ sprite, tinted: key === "tinted" }),
        }
        const drawn: { x: number, y: number, tint: Color|null, mask: boolean }[] = []
        let tint: Color|null = null
        let mask = false
        let origin = [0, 0]
        const painter = {
            setTint(color: Color): void { tint = color.clone() },
            setColorMode(mode: string): void { mask = mode === "mask" },
            push(): void {}, pop(): void {}, scale(): void {},
            translate(x: number, y: number): void { origin = [x, y] },
            sprite(_sprite: Sprite, x: number, y: number): void {
                drawn.push({ x: origin[0] + x, y: origin[1] + y, tint, mask })
            },
        } as unknown as Painter
        const text = new TextLayout(testTheme(uiSetup().gpu).font, 1, shelf)
        const spans = [
            { kind: "picture", picture: { picture: "tinted" }, color: [1, 0, 0], link: null },
            { kind: "picture", picture: { picture: "plain" }, color: null, link: null },
        ] as const
        text.drawSpans(painter, spans, 10, 20, new Color(0, 1, 0))
        expect(drawn.map(({ x, y }) => [x, y])).toEqual([
            [10, 20 + Math.floor((LINE - 5) / 2)], [15, 20 + Math.floor((LINE - 5) / 2)],
        ])
        expect(drawn[0].tint).toMatchObject({ r: 1, g: 0, b: 0 })
        expect(drawn[1].tint).toMatchObject({ r: 1, g: 1, b: 1 })
        drawn.length = 0
        text.drawSpansOutlined(painter, spans, 0, 0, new Color(0, 1, 0), new Color(0, 0, 0))
        expect(drawn.filter(each => each.mask)).toHaveLength(8)
    })

    test("span lines → two links apart, even side by side in the same color", () => {
        const first = {}
        const second = {}
        const [line] = layout().spanLines(spansOf([{ link: first, text: "ab" }, { link: second, text: "cd" }]), 100)
        expect(line.map(span => span.link)).toEqual([first, second])
    })

    test("span at a position → the piece there and where it lies, none past the ends", () => {
        const link = {}
        const each = layout()
        const [line] = each.spanLines(spansOf(["ab", { link, text: "cd" }]), 100)
        const place = { span: { link }, x: 2 * ADVANCE, width: 2 * ADVANCE }
        expect(each.spanAt(line, 3 * ADVANCE)).toMatchObject(place)
        expect(each.spanAt(line, ADVANCE)?.span.link).toBeNull()
        expect(each.spanAt(line, 4 * ADVANCE)).toBeNull()
        expect(each.spanAt(line, -1)).toBeNull()
    })

    test("index at a position → the nearest boundary", () => {
        expect(layout().indexAt("abc", 5)).toBe(1)
        expect(layout().indexAt("abc", 7)).toBe(2)
    })
})
