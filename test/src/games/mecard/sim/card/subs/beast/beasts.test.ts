import { describe, expect, test } from "vitest"
import {
    AIM, BEAST_CARDS, BITE, BLEED, BLINK, BLUE_HEART, BOUNCE_DASH, BATTERING_RAM, DOUBLE_DIAGONAL, LASSO, PINK_HEART, RED_HEART,
    SLASH, SPIRIT_ANCHOR, SPIRIT_PROJECTION, STEP, STUNNING_DASH, SWEEP, TACKLE, THRUST, WAIT, WEAKENING_BLOWS,
} from "@game/core/mecard"
import type { BeastHearts, BodyPart } from "@game/core/mecard"

// --- Fixtures ---

/** What a beast is told by: its run, its bite, its hearts and its body, the cards by their names. */
function shape(name: string): { run: unknown, bite: unknown, hearts: BeastHearts[], body: BodyPart[] } {
    const card = BEAST_CARDS.find(each => each.beast.name === name)
    if(!card) throw new Error(`No beast is named ${name}.`)
    const { run, bite, hearts, body } = card.beast
    return { run, bite, hearts: [...hearts], body: [...body] }
}

// --- Tests ---

describe("the beasts", () => {
    test("the wolf → aims, runs, bites twice", () => {
        expect(shape("Loup")).toMatchObject({ run: [BOUNCE_DASH], bite: [BLEED, SLASH], body: [AIM, "run", "bite", "bite"] })
    })

    test("the hawk → aims and runs twice, then aims and bites", () => {
        expect(shape("Faucon")).toMatchObject({ run: [BLINK], body: [AIM, "run", AIM, "run", AIM, "bite"] })
    })

    test("the bear → aims, waits, bites, waits, runs", () => {
        expect(shape("Ours")).toMatchObject({
            run: [STEP, WAIT], bite: [AIM, WAIT, SLASH, SWEEP], body: [AIM, WAIT, "bite", WAIT, "run"],
            hearts: [{ kind: RED_HEART, count: 4 }, { kind: PINK_HEART, count: 1 }],
        })
    })

    test("the fox → aims, projects its spirit, runs, bites", () => {
        expect(shape("Renard")).toMatchObject({
            run: [SPIRIT_ANCHOR, STEP], bite: [AIM, THRUST], body: [AIM, SPIRIT_PROJECTION, "run", "bite"],
        })
    })

    test("the boar → runs with a stunning dash, bites with a double diagonal thrust, three blue hearts", () => {
        expect(shape("Sanglier")).toMatchObject({
            run: [STUNNING_DASH], bite: [DOUBLE_DIAGONAL, THRUST], hearts: [{ kind: BLUE_HEART, count: 3 }],
            body: ["run", AIM, "bite"],
        })
    })

    test("the ram → a battering ram, weakening blows, three blue hearts, waits then aims", () => {
        expect(shape("Bélier sauvage")).toMatchObject({
            run: [BATTERING_RAM], bite: [WEAKENING_BLOWS], hearts: [{ kind: BLUE_HEART, count: 3 }],
            body: [WAIT, AIM, "run", "bite"],
        })
    })

    test("the frog → a blink, a lasso and a tackle, two blue hearts, aims, lassoes, bites", () => {
        expect(shape("Grenouille")).toMatchObject({
            run: [BLINK], bite: [LASSO, TACKLE], hearts: [{ kind: BLUE_HEART, count: 2 }], body: [AIM, LASSO, "bite"],
        })
    })

    test("every beast card → a card giving a beast, taking nothing", () => {
        expect(BEAST_CARDS).toHaveLength(7)
        for(const card of BEAST_CARDS) expect(card.input).toBeNull()
        expect(BITE.input).toBe(BEAST_CARDS[0].output)
    })
})
