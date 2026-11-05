import { describe, expect, test } from "vitest"
import { Color, spansOf, TextLayout } from "@game/core"
import type { Painter, Sprite } from "@game/core"

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
