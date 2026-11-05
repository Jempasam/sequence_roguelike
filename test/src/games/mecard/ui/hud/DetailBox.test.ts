import { describe, expect, test } from "vitest"
import { Color, plainText } from "@game/core"
import type { Keyword, Text } from "@game/core"
import { CARTE, DECK, THRUST, UNIT } from "@game/core/mecard"
import { DetailBox } from "@game/core/mecard/detail-box"
import { explanationOf } from "@game/core/mecard/explanations"
import { mecardDisplay } from "@game/core/mecard/text-display"

import { ADVANCE, LINE, uiSetup } from "../../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** The room a box keeps around its text for its frame. */
const FRAME = 1

/** A text with a word to hover, four characters in. */
const TEXT: Text = ["voir ", CARTE, " ici"]

/** A point inside the word of {@link TEXT}, and one on the same line out of it. */
const ON_WORD = { x: FRAME + 6 * ADVANCE, y: FRAME + 2 }
const OFF_WORD = { x: FRAME + ADVANCE, y: FRAME + 2 }

/** A point far from the box. */
const AWAY = { x: 300, y: 170 }

interface Bench {
    readonly setup: UiSetup
    readonly box: DetailBox

    /** Move the pointer, and let the box read the frame. */
    point(at: { readonly x: number, readonly y: number }): void

    /** Press the right button where the pointer is, and let the box read the frame. */
    rightClick(): void

    /** What the box says, as a string. */
    said(): string
}

function bench(): Bench {
    const setup = uiSetup()
    const theme = { ...setup.theme, textDisplay: mecardDisplay }
    const box = new DetailBox(theme, { color: new Color() })
    box.hint = "indice"
    setup.main.content.add(box, { x: "start", y: "start" })
    setup.ui.update(1 / 60)
    setup.ui.render()
    let x = 0
    let y = 0
    const read = (): void => {
        box.frame(setup.frame(), setup.ui.pointerX, setup.ui.pointerY)
        setup.ui.update(1 / 60)
        setup.ui.render()
    }
    return {
        setup, box,
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
        said: () => plainText(box.text),
    }
}

/** A bench whose box is locked on {@link TEXT}, laid out, the pointer away. */
function locked(): Bench {
    const each = bench()
    each.box.tell(TEXT)
    each.rightClick()
    each.box.tell(null)
    each.point(AWAY)
    return each
}

const explained = (word: Keyword): string => {
    const text = explanationOf(word)
    if(text === undefined) throw new Error(`${word} has no explanation.`)
    return plainText(text)
}

// --- Tests ---

describe("DetailBox", () => {
    test("free → it follows what is hovered, then goes back to its hint", () => {
        const { box, said } = bench()
        box.tell("carte")
        expect(said()).toBe("carte")
        box.tell(null)
        expect(said()).toBe("indice")
    })

    test("right click while something is hovered → locked on it, whatever is hovered next", () => {
        const { box, rightClick, said } = bench()
        box.tell("carte")
        rightClick()
        expect(box.locked).toBe(true)
        box.tell("autre")
        expect(said()).toBe("carte")
        box.tell(null)
        expect(said()).toBe("carte")
    })

    test("right click with nothing hovered → stays free", () => {
        const { box, rightClick } = bench()
        rightClick()
        expect(box.locked).toBe(false)
    })

    test("right click while locked → let go, back to what is hovered", () => {
        const { box, rightClick, said } = bench()
        box.tell("carte")
        rightClick()
        box.tell("autre")
        rightClick()
        expect(box.locked).toBe(false)
        expect(said()).toBe("autre")
    })

    test("locked, a link hovered outside it → ignored", () => {
        const { box, said } = locked()
        box.hearLink(DECK)
        expect(said()).toBe("voir carte ici")
    })

    test("free, a link hovered outside it → its explanation told, then forgotten", () => {
        const { box, said } = bench()
        box.hearLink(DECK)
        expect(said()).toBe(explained(DECK))
        box.hearLink(null)
        expect(said()).toBe("indice")
    })

    test("locked, its word hovered → the explanation, the text back once the pointer leaves the word", () => {
        const { point, said } = locked()
        point(ON_WORD)
        expect(said()).toBe(explained(CARTE))
        point(OFF_WORD)
        expect(said()).toBe("voir carte ici")
    })

    test("the explanation shown → it stays while the pointer moves inside the place of the word", () => {
        const { point, said } = locked()
        point(ON_WORD)
        point({ x: ON_WORD.x + 1, y: ON_WORD.y + 1 })
        expect(said()).toBe(explained(CARTE))
    })

    test("the pointer leaving the box from the word → the text back", () => {
        const { point, said } = locked()
        point(ON_WORD)
        point(AWAY)
        expect(said()).toBe("voir carte ici")
    })

    test("back on the word after leaving it → the explanation again", () => {
        const { point, said } = locked()
        point(ON_WORD)
        point(OFF_WORD)
        point(ON_WORD)
        expect(said()).toBe(explained(CARTE))
    })

    test("right click on a word while locked → locked on its explanation, even once the pointer left", () => {
        const { box, point, rightClick, said } = locked()
        point(ON_WORD)
        rightClick()
        expect(box.locked).toBe(true)
        point(AWAY)
        expect(said()).toBe(explained(CARTE))
    })

    test("locked on an explanation → its own words are hovered in turn", () => {
        const { point, rightClick, said } = locked()
        point(ON_WORD)
        rightClick()
        point(AWAY)
        // `Ce qu'une unité pioche`: the word starts nine characters in.
        point({ x: FRAME + 11 * ADVANCE, y: FRAME + 2 })
        expect(said()).toBe(explained(UNIT))
    })

    test("right click off the words, locked on an explanation → let go, with no way back to the text", () => {
        const { box, point, rightClick, said } = locked()
        point(ON_WORD)
        rightClick()
        point(AWAY)
        rightClick()
        expect(box.locked).toBe(false)
        expect(said()).toBe("indice")
    })

    test("a card in the text → hovered as a keyword, its description told", () => {
        const { box, point, rightClick, said } = bench()
        box.tell(["voir ", THRUST])
        rightClick()
        box.tell(null)
        point({ x: FRAME + 6 * ADVANCE, y: FRAME + LINE / 2 })
        expect(said()).toBe(plainText(explanationOf(THRUST) ?? ""))
    })
})
