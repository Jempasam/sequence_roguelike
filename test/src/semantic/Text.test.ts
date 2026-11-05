import { describe, expect, test } from "vitest"
import { isGroup, Keyword, KeywordWord, plainText, spansOf } from "@game/core"
import type { Semantic, Text } from "@game/core"

// --- Fixture builders ---

const RED = [1, 0, 0] as const

/** An object that tells itself richer than its `toString`. */
class Goblin implements Semantic {
    public toString(): string { return "gobelin" }
    public toSemString(): Text { return { color: RED, text: "Gobelin" } }
}

/** An object that tells itself only by its `toString`. */
class Potion {
    public toString(): string { return "potion" }
}

// --- Tests ---

describe("plainText", () => {
    test("parts → end to end, no space added", () => {
        expect(plainText(["Je gagne ", 12, " PV."])).toBe("Je gagne 12 PV.")
    })

    test("colored part, object → their strings, toSemString before toString", () => {
        expect(plainText([{ color: RED, text: [new Goblin(), " boit une "] }, new Potion()]))
            .toBe("Gobelin boit une potion")
    })

    test("an array holding arrays → a group, one item per line", () => {
        expect(plainText([["A un effet de faim"], ["A un effet de potion"]]))
            .toBe("A un effet de faim\nA un effet de potion")
    })

    test("two texts spread end to end → one line, not a group", () => {
        const first = ["Gobelin", " attaque "]
        const second = ["Héros"]
        expect(isGroup([...first, ...second])).toBe(false)
        expect(plainText([...first, ...second])).toBe("Gobelin attaque Héros")
    })

    test("svg → its alt, nothing without one", () => {
        expect(plainText(["a", { svg: "M0 0 L1 0 L0 1 Z", size: 1, alt: "♥" }, { svg: "M0 0", size: 1 }]))
            .toBe("a♥")
    })

    test("display → in place of the text of the object", () => {
        expect(plainText([new Potion()], value => value instanceof Potion ? "fiole" : undefined)).toBe("fiole")
    })

    test("an object telling itself in its own text → an error, not a hang", () => {
        const loop: Semantic = { toSemString: () => [loop] }
        expect(() => plainText(loop)).toThrow(/deep/)
    })
})

describe("Keyword", () => {
    const COLLAGE = new Keyword("collage")

    test("alone → its name, written as a form → that form", () => {
        expect(plainText(["Un ", COLLAGE, " de cartes ", COLLAGE.as("collées")])).toBe("Un collage de cartes collées")
    })

    test("a form → its keyword found back by a reader, however it is written", () => {
        const display = (value: object) => {
            if(!(value instanceof KeywordWord) || value.keyword !== COLLAGE) return undefined
            return value.form.toUpperCase()
        }
        expect(plainText([COLLAGE, " ", COLLAGE.as("collées")], display)).toBe("COLLAGE COLLÉES")
    })
})

describe("spansOf", () => {
    test("colored part → its color on each piece inside, none outside", () => {
        expect(spansOf(["a", { color: RED, text: ["b", 1] }])).toEqual([
            { kind: "string", text: "a", color: null, link: null },
            { kind: "string", text: "b", color: RED, link: null },
            { kind: "string", text: "1", color: RED, link: null },
        ])
    })

    test("object with a toSemString → read through it", () => {
        expect(spansOf(new Goblin())).toEqual([{ kind: "string", text: "Gobelin", color: RED, link: null }])
    })

    test("linked part → its link on each piece inside, its color kept, none outside", () => {
        const goblin = new Goblin()
        expect(spansOf(["a", { link: goblin, text: goblin.toSemString() }])).toEqual([
            { kind: "string", text: "a", color: null, link: null },
            { kind: "string", text: "Gobelin", color: RED, link: goblin },
        ])
    })

    test("display giving a link → the object found back on its piece", () => {
        const potion = new Potion()
        const display = (value: object) => value === potion ? { link: value, text: "fiole" } : undefined
        expect(spansOf(potion, display)).toEqual([{ kind: "string", text: "fiole", color: null, link: potion }])
    })
})
