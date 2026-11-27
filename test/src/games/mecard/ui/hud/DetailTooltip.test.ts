import { describe, expect, test } from "vitest"
import { Sprite } from "@game/core-src/engine/gpu/Sprite"
import { Color } from "@game/core-src/engine/math/Color"
import { Paragraph } from "@game/core-src/engine/ui/widget/Paragraph"
import { plainText } from "@game/core-src/semantic/Text"
import type { Text } from "@game/core-src/semantic/Text"
import { CARTE, DECK } from "@game/core-src/games/mecard/sim/base/keywords"
import { Detail } from "@game/core/mecard/detail"
import { DetailTooltip } from "@game/core/mecard/detail-tooltip"
import { explanationOf } from "@game/core/mecard/explanations"
import { mecardDisplay } from "@game/core/mecard/text-display"

import { ADVANCE, Probe, uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A text with a word to explain, four characters in. */
const TEXT: Text = ["voir ", CARTE, " ici"]

/** A point over the part that tells, and one far from everything. */
const OVER = { x: 5, y: 5 }
const AWAY = { x: 300, y: 170 }

/** Where a bubble lies on the popup layer, and the room it keeps around its text. */
interface Placed {
    readonly x: number
    readonly y: number
    readonly padding: number
}

interface Bench {
    readonly setup: UiSetup
    readonly tooltip: DetailTooltip
    readonly detail: Detail

    /** Move the pointer, and let the tooltip read the frame. */
    point(at: { readonly x: number, readonly y: number }): void

    /** Press the right button where the pointer is, and let the tooltip read the frame. */
    rightClick(): void

    /** The bubbles of the popup layer, in the order they were opened. */
    bubbles(): readonly Placed[]
}

/** A part 20 wide that tells {@link TEXT}, a tooltip listening to it, and the pointer away. */
function bench(text: Text = TEXT, onPaper = false): Bench {
    const setup = uiSetup()
    const theme = { ...setup.theme, textDisplay: mecardDisplay }
    const part = new Probe("part", [20, 20], { interactive: true })
    setup.main.content.add(part, { offsetX: 0, offsetY: 0 })
    const paper = new Sprite(theme.white.texture, 0, 0, 40, 40)
    const tooltip = new DetailTooltip(setup.ui, setup.popup, theme, {
        color: new Color(), ...onPaper ? { paper: () => paper } : {},
    })
    const detail = Detail.on(part, text)
    tooltip.attach(detail)
    setup.ui.update(1 / 60)
    setup.ui.render()
    let x = AWAY.x
    let y = AWAY.y
    const read = (): void => {
        tooltip.frame(setup.frame())
        setup.ui.update(1 / 60)
        setup.ui.render()
    }
    const bench: Bench = {
        setup, tooltip, detail,
        point: at => {
            x = at.x
            y = at.y
            setup.port.send({ type: "pointer-move", x, y })
            read()
        },
        rightClick: () => {
            setup.port.send({ type: "pointer-down", button: 2, x, y }, { type: "pointer-up", button: 2, x, y })
            read()
        },
        bubbles: () => setup.popup.content.children.filter((_, index) => index % 3 === 2).map(child => ({
            x: child.bounds.x, y: child.bounds.y, padding: theme.tooltip.padding,
        })),
    }
    bench.point(AWAY)
    return bench
}

/** A point over the word of the bubble at a place of the popup layer. */
function onWord(bubble: Placed): { x: number, y: number } {
    return { x: bubble.x + bubble.padding + 6 * ADVANCE, y: bubble.y + bubble.padding + 2 }
}

/** A point in a bubble, on its first line but not on its word. */
function inside(bubble: Placed): { x: number, y: number } {
    return { x: bubble.x + bubble.padding + 1, y: bubble.y + bubble.padding + 2 }
}

/** A tooltip and a text of the screen, hearing the words of it, at the top left, the pointer away. */
function screenBench(): {
    setup: UiSetup, tooltip: DetailTooltip, paragraph: Paragraph, point: Bench["point"],
    rightClick: Bench["rightClick"], bubbles: Bench["bubbles"],
} {
    const setup = uiSetup()
    const theme = { ...setup.theme, textDisplay: mecardDisplay }
    const tooltip = new DetailTooltip(setup.ui, setup.popup, theme, { color: new Color() })
    const paragraph = new Paragraph(theme, TEXT, { onLink: tooltip.hearLink })
    setup.main.content.add(paragraph, { offsetX: 0, offsetY: 0 })
    const part = new Probe("part", [20, 20], { interactive: true })
    setup.main.content.add(part, { offsetX: OTHER.x - 5, offsetY: OTHER.y - 5 })
    tooltip.attach(Detail.on(part, "autre"))
    setup.ui.update(1 / 60)
    setup.ui.render()
    let x = AWAY.x
    let y = AWAY.y
    const read = (): void => {
        tooltip.frame(setup.frame())
        setup.ui.update(1 / 60)
        setup.ui.render()
    }
    const point: Bench["point"] = at => {
        x = at.x
        y = at.y
        setup.port.send({ type: "pointer-move", x, y })
        read()
    }
    const rightClick = (): void => {
        setup.port.send({ type: "pointer-down", button: 2, x, y }, { type: "pointer-up", button: 2, x, y })
        read()
    }
    const bubbles = (): readonly Placed[] => setup.popup.content.children
        .filter((_, index) => index % 3 === 2)
        .map(child => ({ x: child.bounds.x, y: child.bounds.y, padding: theme.tooltip.padding }))
    point(AWAY)
    return { setup, tooltip, paragraph, point, rightClick, bubbles }
}

/** A point over another part of the screen, that tells a text of its own. */
const OTHER = { x: 105, y: 105 }

/** A point over the word of the text of the screen. */
const ON_SCREEN_WORD = { x: 6 * ADVANCE, y: 2 }

// --- Tests ---

describe("DetailTooltip.hearLink", () => {
    test("pointer over a word of a text of the screen → a bubble opens beside it with its explanation", () => {
        const { tooltip, point, bubbles } = screenBench()
        point(ON_SCREEN_WORD)
        expect(tooltip.open).toBe(true)
        expect(plainText(tooltip.text!)).toBe(plainText(explanationOf(CARTE)!))
        expect(bubbles()).toHaveLength(1)
        expect(bubbles()[0].x).toBeGreaterThan(ON_SCREEN_WORD.x)
    })

    test("pointer leaves the word → the bubble closes", () => {
        const { tooltip, point } = screenBench()
        point(ON_SCREEN_WORD)
        point(AWAY)
        expect(tooltip.open).toBe(false)
    })

    test("a bubble pinned elsewhere → a word of the screen opens nothing", () => {
        const { tooltip, point, rightClick } = screenBench()
        point(OTHER)
        rightClick()
        point(AWAY)
        expect(tooltip.pinned).toBe(1)
        point(ON_SCREEN_WORD)
        expect(tooltip.open).toBe(false)
    })

    test("right click over the bubble of a word → it is pinned as a root and stays open under the word", () => {
        const { tooltip, point, rightClick, bubbles } = screenBench()
        point(ON_SCREEN_WORD)
        rightClick()
        expect(tooltip.pinned).toBe(1)
        expect(tooltip.open).toBe(false)
        expect(tooltip.outlines).toEqual(["white"])
        point(AWAY)
        expect(bubbles()).toHaveLength(1)
        expect(tooltip.outlines).toEqual(["dark"])
    })

    test("the word of a bubble pinned → hovered again, it aims at that bubble and opens no other", () => {
        const { tooltip, point, rightClick, bubbles } = screenBench()
        point(ON_SCREEN_WORD)
        rightClick()
        point(AWAY)
        point(ON_SCREEN_WORD)
        expect(tooltip.open).toBe(false)
        expect(bubbles()).toHaveLength(1)
        expect(tooltip.outlines).toEqual(["white"])
    })

    test("reset while the pointer is over a word → the bubble closes, as the paragraph may be gone", () => {
        const { tooltip, point } = screenBench()
        point(ON_SCREEN_WORD)
        tooltip.reset()
        expect(tooltip.open).toBe(false)
    })
})

describe("DetailTooltip", () => {
    test("pointer over what the detail tells → a bubble opens off it with its text", () => {
        const { tooltip, point, bubbles } = bench()
        point(OVER)
        expect(tooltip.open).toBe(true)
        expect(plainText(tooltip.text!)).toBe(plainText(TEXT))
        expect(bubbles()).toHaveLength(1)
        expect(bubbles()[0].y).toBeGreaterThanOrEqual(20)
    })

    test("pointer over a part larger than the bubble → the bubble is level with the pointer, off the part", () => {
        const setup = uiSetup()
        const theme = { ...setup.theme, textDisplay: mecardDisplay }
        const part = new Probe("part", [200, 20], { interactive: true })
        setup.main.content.add(part, { offsetX: 0, offsetY: 0 })
        const tooltip = new DetailTooltip(setup.ui, setup.popup, theme, { color: new Color() })
        tooltip.attach(Detail.on(part, TEXT))
        setup.ui.render()
        setup.port.send({ type: "pointer-move", x: AWAY.x, y: AWAY.y })
        tooltip.frame(setup.frame())
        setup.port.send({ type: "pointer-move", x: 150, y: 5 })
        tooltip.frame(setup.frame())
        setup.ui.update(1 / 60)
        setup.ui.render()
        const bubble = setup.popup.content.children.filter((_, index) => index % 3 === 2)[0]
        const { x, width, y } = bubble.bounds
        expect(y).toBeGreaterThanOrEqual(20)
        expect(x).toBeLessThanOrEqual(150)
        expect(x + width).toBeGreaterThanOrEqual(150)
    })

    test("pointer leaves → the bubble closes", () => {
        const { tooltip, point, bubbles } = bench()
        point(OVER)
        point(AWAY)
        expect(tooltip.open).toBe(false)
        expect(bubbles()).toHaveLength(0)
    })

    test("the detail changes its text while shown → the bubble is changed, not opened again", () => {
        const { tooltip, detail, point, bubbles } = bench()
        point(OVER)
        detail.set("autre")
        expect(plainText(tooltip.text!)).toBe("autre")
        expect(bubbles()).toHaveLength(1)
    })

    test("right click over a bubble → it is pinned and stays when the pointer leaves", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        expect(tooltip.pinned).toBe(1)
        expect(tooltip.open).toBe(false)
        expect(bubbles()).toHaveLength(1)
    })

    test("right click with no temporary bubble → every pinned bubble is let go", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        rightClick()
        expect(tooltip.pinned).toBe(0)
        expect(bubbles()).toHaveLength(0)
    })

    test("pointer over a pinned bubble still hovered → no second bubble opens for the same text", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        expect(tooltip.open).toBe(false)
        expect(bubbles()).toHaveLength(1)
    })

    test("pointer over a word of a pinned bubble → a temporary bubble opens beside it with its explanation", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        const [pinned] = bubbles()
        point(onWord(pinned))
        expect(tooltip.open).toBe(true)
        expect(plainText(tooltip.text!)).toBe(plainText(explanationOf(CARTE)!))
        expect(bubbles()).toHaveLength(2)
        expect(bubbles()[1].x).toBeGreaterThan(pinned.x)
    })

    test("right click over the explanation of a word → it is pinned beside the first, and the pointer leaving keeps both", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        point(onWord(bubbles()[0]))
        rightClick()
        point(AWAY)
        expect(tooltip.pinned).toBe(2)
        expect(bubbles()).toHaveLength(2)
    })

    test("right click over the explanation pinned from a word → it stays, with the bubble it comes from", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        point(onWord(bubbles()[0]))
        rightClick()
        point(AWAY)
        point(inside(bubbles()[1]))
        rightClick()
        expect(tooltip.pinned).toBe(2)
        expect(bubbles()).toHaveLength(2)
    })

    test("right click over the first pinned bubble → it stays and the ones opened from it go", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        point(onWord(bubbles()[0]))
        rightClick()
        point(AWAY)
        point(inside(bubbles()[0]))
        rightClick()
        expect(tooltip.pinned).toBe(1)
        expect(bubbles()).toHaveLength(1)
    })

    test("a bubble pinned, the pointer aiming at none → it is outlined in dark grey, as it would go", () => {
        const { tooltip, point, rightClick } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        expect(tooltip.outlines).toEqual(["dark"])
    })

    test("the pointer over a pinned bubble → it is outlined in white, as it would stay", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        point(inside(bubbles()[0]))
        expect(tooltip.outlines).toEqual(["white"])
    })

    test("the pointer over a word of a pinned bubble → its bubble is grey, the pinned one white", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        point(onWord(bubbles()[0]))
        expect(tooltip.outlines).toEqual(["white", "grey"])
    })

    test("the pointer over a word whose bubble is pinned → both bubbles are white", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        point(onWord(bubbles()[0]))
        rightClick()
        point(AWAY)
        point(onWord(bubbles()[0]))
        expect(tooltip.outlines).toEqual(["white", "white"])
        expect(tooltip.open).toBe(false)
    })

    test("the pointer over a pinned bubble opened from another → both are white", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        point(onWord(bubbles()[0]))
        rightClick()
        point(AWAY)
        point(inside(bubbles()[1]))
        expect(tooltip.outlines).toEqual(["white", "white"])
    })

    test("the pointer over the first of two pinned bubbles → the second would go, in dark grey", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        point(onWord(bubbles()[0]))
        rightClick()
        point(AWAY)
        point(inside(bubbles()[0]))
        expect(tooltip.outlines).toEqual(["white", "dark"])
    })

    test("a bubble pinned and what is hovered changes → no temporary bubble opens beside it", () => {
        const { tooltip, detail, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        detail.set("autre")
        point(OVER)
        expect(tooltip.open).toBe(false)
        expect(bubbles()).toHaveLength(1)
    })

    test("every bubble let go → what is hovered opens a bubble again", () => {
        const { tooltip, point, rightClick } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        rightClick()
        point(OVER)
        expect(tooltip.pinned).toBe(0)
        expect(tooltip.open).toBe(true)
    })

    test("a word of the last bubble of a chain → a bubble opens; a word of an earlier bubble → none", () => {
        const text: Text = ["voir ", CARTE, " et ", DECK, " ici"]
        const second = plainText(["voir ", CARTE, " et "]).length + 1
        const { tooltip, point, rightClick, bubbles } = bench(text)
        point(OVER)
        rightClick()
        point(AWAY)
        const [first] = bubbles()
        const onSecond = { x: first.x + first.padding + second * ADVANCE, y: first.y + first.padding + 2 }
        point(onSecond)
        expect(plainText(tooltip.text!)).toBe(plainText(explanationOf(DECK)!))
        point(AWAY)
        point(onWord(first))
        rightClick()
        point(AWAY)
        point(onSecond)
        expect(tooltip.open).toBe(false)
        expect(tooltip.pinned).toBe(2)
        point(onWord(first))
        expect(tooltip.outlines).toEqual(["white", "white"])
    })

    test("a word in a light color over the paper → its bubble keeps room for the outline of the word", () => {
        const light: Text = ["voir ", { color: [1, 1, 1], text: "blanc" }, " ici"]
        const dark: Text = ["voir ", { color: [0.05, 0.03, 0.02], text: "sombre" }, " ici"]
        const open = (text: Text) => {
            const each = bench(text, true)
            each.point(OVER)
            return each.setup.popup.content.children[2].fixedSize!
        }
        const bright = open(light)
        const plain = open(dark)
        expect(bright.height).toBe(plain.height + 2)
    })

    test("dispose → every bubble closes and the detail is not heard any more", () => {
        const { tooltip, point, rightClick, bubbles } = bench()
        point(OVER)
        rightClick()
        point(AWAY)
        tooltip.dispose()
        point(OVER)
        expect(bubbles()).toHaveLength(0)
        expect(tooltip.open).toBe(false)
    })
})
