import { describe, expect, test } from "vitest"
import { plainText, spansOf } from "@game/core"
import type { Text } from "@game/core"
import {
    ALL_CARDS, CARTE, FUSION, CHARGE, DECK, Damage, FusionCard, HALTS, HEART, HeartCount, ITEMS,
    MERGE, RED_HEART, SLASH, SUPPRESSION, THRUST, UNIT, USABLES, UNSTABLE_THRUST,
} from "@game/core/mecard"
import { explanationOf } from "@game/core/mecard/explanations"
import { mecardDisplay } from "@game/core/mecard/text-display"

// --- Fixture builders ---

const spans = (text: Text) => spansOf(text, mecardDisplay)

/** What a text means, read without the interface: no picture comes from the simulation. */
const hasPicture = (text: Text): boolean => spansOf(text).some(span => span.kind === "svg")

const ALL_TEXTS: readonly (readonly [string, Text])[] = [
    ...ALL_CARDS.map(card => [card.name, card.description] as const),
    ...ITEMS.map(item => [item.name, item.description] as const),
    ...USABLES.map(usable => [usable.name, usable.description] as const),
    ...Object.values(HALTS).map(type => [type.name, type.description] as const),
]

// --- Tests ---

describe("mecardDisplay", () => {
    test("a damage → the number, then a half heart, the word kept as its plain string", () => {
        const pieces = spans(new Damage(2, "physical"))
        expect(pieces.at(-1)).toMatchObject({ kind: "svg", path: { alt: "dégâts" }, link: null })
        expect(plainText(new Damage(2, "physical"), mecardDisplay)).toBe("2 dégâts")
    })

    test("a heart → drawn in the color of the text around it", () => {
        const pieces = spans(new HeartCount(1))
        expect(pieces.at(-1)?.color).toEqual(pieces[0].color)
    })

    test("a keyword → its form, standing out, linking to the keyword whatever the form", () => {
        const [piece] = spans(FUSION.as("collées"))
        expect(piece).toMatchObject({ kind: "string", text: "collées", link: FUSION })
        expect(piece.color).not.toBeNull()
    })

    test("a keyword alone → as its plain form", () => {
        expect(spans(DECK)[0]).toMatchObject({ text: "deck", link: DECK })
    })

    test("a card → its name in the color of its rarity, linking to it", () => {
        const [piece] = spans(THRUST)
        expect(piece).toMatchObject({ text: THRUST.name, link: THRUST })
        expect(piece.color).toEqual(spansOf(THRUST)[0].color)
    })

    test("the cards of a collage → each linking to itself in its description", () => {
        const fusion = new FusionCard([SLASH, THRUST])
        const links = spans(fusion.description).map(span => span.link)
        expect(links).toContain(SLASH)
        expect(links).toContain(THRUST)
    })

    test("the cards of a mix → each linking to itself in its description", () => {
        const links = spans(CHARGE.description).map(span => span.link)
        for(const card of CHARGE.contents) expect(links).toContain(card)
    })

    test("a collage in a collage → the inner one links too, and tells its own cards", () => {
        const outer = new FusionCard([UNSTABLE_THRUST, SLASH])
        expect(spans(outer.description).map(span => span.link)).toContain(UNSTABLE_THRUST)
        const inner = explanationOf(UNSTABLE_THRUST) ?? ""
        const links = spans(inner).map(span => span.link)
        for(const card of UNSTABLE_THRUST.contents) expect(links).toContain(card)
    })

    test("an object it does not know → tells itself, with no link", () => {
        expect(spans({ toString: () => "chose" } as Text)).toEqual([
            { kind: "string", text: "chose", color: null, link: null },
        ])
    })
})

describe("explanationOf", () => {
    test.each([FUSION, MERGE, CARTE, UNIT, SUPPRESSION, DECK])("%s → an explanation", keyword => {
        expect(plainText(explanationOf(keyword) ?? "")).not.toBe("")
    })

    test("a heart, a mere icon → none", () => {
        expect(explanationOf(HEART)).toBeUndefined()
    })

    test("what has a description → its name and its description", () => {
        expect(plainText(explanationOf(THRUST) ?? "")).toBe(`${THRUST.name} : ${plainText(THRUST.description)}`)
        expect(plainText(explanationOf(ITEMS[0]) ?? "")).toContain(plainText(ITEMS[0].description))
        expect(plainText(explanationOf(USABLES[0]) ?? "")).toContain(plainText(USABLES[0].description))
        expect(plainText(explanationOf(RED_HEART) ?? "")).toContain(plainText(RED_HEART.description))
    })
})

describe("the texts of the game", () => {
    test.each(ALL_TEXTS)("%s → says what it means, with no picture of the simulation", (_name, text) => {
        expect(hasPicture(text)).toBe(false)
    })

    test.each(ALL_TEXTS)("%s → no sentence cut by an array left inside another", (_name, text) => {
        expect(plainText(text)).not.toMatch(/ \n|\n[ .,]/)
    })
})
