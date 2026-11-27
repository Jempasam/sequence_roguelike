import { describe, expect, test, vi } from "vitest"
import { Color } from "@game/core-src/engine/math/Color"
import { Paragraph } from "@game/core-src/engine/ui/widget/Paragraph"
import type { Sprite } from "@game/core-src/engine/gpu/Sprite"
import type { Text } from "@game/core-src/semantic/Text"

import { ADVANCE, LINE, uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

const LINK = {}

/** A text whose second word links, and the setup showing it. */
function shown(onLink?: (link: object|null) => void): { readonly setup: UiSetup } {
    const setup = uiSetup()
    const text = ["ab ", { link: LINK, text: "cd" }]
    const paragraph = new Paragraph(setup.theme, text, onLink ? { onLink } : {})
    setup.main.content.add(paragraph, { x: "start", y: "start" })
    setup.ui.update(1 / 60)
    setup.ui.render()
    return { setup }
}

function point(setup: UiSetup, x: number, y: number): void {
    setup.port.send({ type: "pointer-move", x, y })
    setup.frame()
}

// --- Tests ---

describe("Paragraph", () => {
    test("no listener → leaves the pointer to what lies under, links or not", () => {
        const { setup } = shown()
        point(setup, 4 * ADVANCE, 1)
        expect(setup.ui.hovered).toBeNull()
    })

    test("a listener but no link → leaves the pointer too", () => {
        const setup = uiSetup()
        setup.main.content.add(new Paragraph(setup.theme, "ab", { onLink: () => {} }), { x: "start", y: "start" })
        setup.ui.update(1 / 60)
        setup.ui.render()
        point(setup, 1, 1)
        expect(setup.ui.hovered).toBeNull()
    })

    test("the pointer over a link → told once, with where the word lies", () => {
        const heard = vi.fn()
        const { setup } = shown(heard)
        point(setup, 3 * ADVANCE + 1, 1)
        point(setup, 3 * ADVANCE + 2, 1)
        expect(heard).toHaveBeenCalledTimes(1)
        expect(heard.mock.calls[0][0]).toBe(LINK)
        const area = { x: 3 * ADVANCE, y: 0, width: 2 * ADVANCE, height: LINE }
        expect(heard.mock.calls[0][1]).toMatchObject(area)
    })

    test("the pointer over a picture linking → told, with where the picture lies", () => {
        const heard = vi.fn()
        const setup = uiSetup()
        const sprite: Sprite = setup.theme.white
        const theme = { ...setup.theme, textPictures: { of: () => ({ sprite, tinted: false }) } }
        const text = ["ab ", { link: LINK, text: { picture: "coin", alt: "or" } }]
        setup.main.content.add(new Paragraph(theme, text, { onLink: heard }), { x: "start", y: "start" })
        setup.ui.update(1 / 60)
        setup.ui.render()
        point(setup, 3 * ADVANCE + 2, 1)
        expect(heard.mock.calls[0][0]).toBe(LINK)
        expect(heard.mock.calls[0][1]).toMatchObject({ x: 3 * ADVANCE, width: sprite.width })
        point(setup, 3 * ADVANCE + sprite.width + 1, 1)
        expect(heard).toHaveBeenLastCalledWith(null, null)
    })

    test("the pointer leaving the link → told, on the text and out of the paragraph", () => {
        const heard = vi.fn()
        const { setup } = shown(heard)
        point(setup, 3 * ADVANCE + 1, 1)
        point(setup, 1, 1)
        expect(heard).toHaveBeenLastCalledWith(null, null)
        point(setup, 3 * ADVANCE + 1, 1)
        point(setup, 200, 100)
        expect(heard).toHaveBeenLastCalledWith(null, null)
        expect(heard).toHaveBeenCalledTimes(4)
    })
})

describe("Paragraph.backdrop", () => {
    const PAPER = new Color(0.89, 0.82, 0.65)
    const WHITE = [1, 1, 1] as const
    const DARK = [0.05, 0.03, 0.02] as const

    /** The size a paragraph asks for, in the text and the backdrop given. */
    function sizeOf(text: Text, backdrop?: Color, outline?: Color): [number, number] {
        const { theme } = uiSetup()
        const paragraph = new Paragraph(theme, text, {
            color: new Color(0.05, 0.03, 0.02),
            ...backdrop ? { backdrop } : {},
            ...outline ? { outline } : {},
        })
        const { preferredWidth, preferredHeight } = paragraph.measure(Infinity)
        return [preferredWidth, preferredHeight]
    }

    test("a white word over a light backdrop → one pixel more around the text for its outline", () => {
        const text = ["ab ", { color: WHITE, text: "cd" }]
        const [width, height] = sizeOf(text)
        expect(sizeOf(text, PAPER)).toEqual([width + 2, height + 2])
    })

    test("only dark text over a light backdrop → the size is unchanged", () => {
        const text = ["ab ", { color: DARK, text: "cd" }]
        expect(sizeOf(text, PAPER)).toEqual(sizeOf(text))
    })

    test("a white word and no backdrop → the size is unchanged", () => {
        const text = ["ab ", { color: WHITE, text: "cd" }]
        expect(sizeOf(text, undefined)).toEqual(sizeOf(text))
    })

    test("a general outline too → it alone gives its pixel, not a second one", () => {
        const text = ["ab ", { color: WHITE, text: "cd" }]
        const outline = new Color(0, 0, 0)
        expect(sizeOf(text, PAPER, outline)).toEqual(sizeOf(text, undefined, outline))
    })

    test("the backdrop set later → the size follows it, and back", () => {
        const { theme } = uiSetup()
        const paragraph = new Paragraph(theme, ["ab ", { color: WHITE, text: "cd" }])
        const bare = paragraph.measure(Infinity).preferredWidth
        paragraph.backdrop = PAPER
        expect(paragraph.measure(Infinity).preferredWidth).toBe(bare + 2)
        paragraph.backdrop = null
        expect(paragraph.measure(Infinity).preferredWidth).toBe(bare)
    })

    test("the color of the paragraph changes to one that tells apart → the outline room goes", () => {
        const { theme } = uiSetup()
        const paragraph = new Paragraph(theme, "abcd", { color: new Color(1, 1, 1), backdrop: PAPER })
        const outlined = paragraph.measure(Infinity).preferredWidth
        paragraph.color = new Color(0.05, 0.03, 0.02)
        expect(paragraph.measure(Infinity).preferredWidth).toBe(outlined - 2)
    })
})
