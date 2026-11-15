import { describe, expect, test } from "vitest"
import {
    ALL_CARDS, BASE_ELEMENTS, CardChain, canWeave, CARD_CODECS, collageOf, composable, FIRE, FusionCard, Heart, mergeable,
    MergedCard, RandomCard, readsWhole, RED_HEART, STEP, TURNS, UNIVERSAL_ELEMENTS, VARIANT_CARDS, Vector2, WALKS,
} from "@game/core/mecard"
import type { Card } from "@game/core/mecard"

import { battle, HEROES } from "../fixtures"

// --- Fixture builders ---

/** A unit of the heroes facing a direction. */
function facing(direction: Vector2) {
    return battle().add({
        name: "hero", team: HEROES, controller: "player", position: new Vector2(3, 3), direction,
        hearts: Heart.many(RED_HEART, 4), decks: [[]],
    })
}

/** A battle with a unit holding cards, and the unit. */
function holding(...cards: Card[]) {
    const on = battle()
    const hero = on.add({
        name: "hero", team: HEROES, controller: "player", position: new Vector2(3, 3), direction: Vector2.UP,
        hearts: Heart.many(RED_HEART, 4), decks: [[]],
    })
    hero.hand.push(...cards)
    on.startRound()
    return { on, hero }
}

/** The cards with variants, one family each. */
const FAMILIES: readonly (readonly Card[])[] = [TURNS, WALKS, UNIVERSAL_ELEMENTS]

// --- Tests ---

describe("the variants of a card", () => {
    test("a card with nothing to choose → none", () => {
        expect(STEP.variants().size).toBe(0)
        expect(FIRE.variants().size).toBe(0)
        expect(composable(STEP)).toBe(true)
    })

    test("a family → every card of it lists the same variants, itself among them, in one group", () => {
        for(const family of FAMILIES){
            const variants = [...family[0].variants().values()]
            expect(variants).toEqual(family)
            for(const card of family){
                expect(card.variants()).toBe(family[0].variants())
                expect(card.group).toBe(family[0].group)
                expect(variants).toContain(card)
            }
        }
    })

    test("the keys of a family → all told apart", () => {
        for(const family of FAMILIES){
            expect(new Set(family[0].variants().keys()).size).toBe(family.length)
        }
    })

    test("a walk → chosen by its distance, a universal element by its element", () => {
        expect([...WALKS[0].variants().keys()]).toEqual(WALKS.map(walk => walk.length))
        expect([...UNIVERSAL_ELEMENTS[0].variants().keys()]).toEqual(BASE_ELEMENTS)
        expect(UNIVERSAL_ELEMENTS.map(card => card.get())).toEqual(BASE_ELEMENTS)
    })

    test("the variant a unit would choose → the turn facing where it faces, the walk of a step, the first element", () => {
        expect(TURNS[0].variantFor(facing(Vector2.RIGHT))).toBe(TURNS[8])
        expect(TURNS[8].variantFor(facing(Vector2.DOWN))).toBe(TURNS[16])
        expect(WALKS[4].variantFor(facing(Vector2.UP)).name).toBe("Marche")
        expect((WALKS[4].variantFor(facing(Vector2.UP)) as typeof WALKS[0]).length).toBe(2)
        expect(UNIVERSAL_ELEMENTS[3].variantFor(facing(Vector2.UP))).toBe(UNIVERSAL_ELEMENTS[0])
        expect(STEP.variantFor(facing(Vector2.UP))).toBe(STEP)
    })

    test("one card of a family in the catalog → found by its name, none of them as loot", () => {
        expect(ALL_CARDS).toContain(WALKS[1])
        expect(ALL_CARDS).toContain(UNIVERSAL_ELEMENTS[0])
        for(const family of VARIANT_CARDS) expect(family.variants().size).toBeGreaterThan(1)
    })
})

describe("the variants, in the codec", () => {
    test("each variant of each family → written and read back as itself", () => {
        for(const family of FAMILIES){
            for(const card of family) expect(CARD_CODECS.load(CARD_CODECS.save(card))).toBe(card)
        }
    }, 20_000)

    test("a variant of a family → written with its place, not by name alone", () => {
        expect(CARD_CODECS.save(TURNS[5])).toBe("variant:Tourner:5")
        expect(CARD_CODECS.save(WALKS[1])).toBe("variant:Marche:1")
    })

    test("an unknown family or a place off the table → refused", () => {
        expect(() => CARD_CODECS.load("variant:Inconnue:2")).toThrow(/another version/)
        expect(() => CARD_CODECS.load(`variant:Tourner:${TURNS.length}`)).toThrow(/another version/)
        expect(() => CARD_CODECS.load("variant:Tourner")).toThrow(/another version/)
    })
})

describe("the variants, in a composite", () => {
    test("a collage, a mélange or a draw of one → refused, at any depth", () => {
        expect(() => new FusionCard([STEP, TURNS[0]])).toThrow(/cannot be held/)
        expect(() => new MergedCard([STEP, WALKS[1]])).toThrow(/cannot be held/)
        expect(() => new RandomCard(TURNS[0], WALKS[1])).toThrow(/cannot be held/)
        expect(() => new FusionCard([new FusionCard([STEP, STEP]), TURNS[3]])).toThrow(/cannot be held/)
    })

    test("the cards that are no variants → held as before", () => {
        expect(new FusionCard([STEP, STEP]).contents).toEqual([STEP, STEP])
        expect(new MergedCard([STEP, STEP]).contents).toEqual([STEP, STEP])
    })

    test("read whole, merged or woven → never with one", () => {
        expect(readsWhole([STEP, STEP])).toBe(true)
        expect(readsWhole([STEP, TURNS[0]])).toBe(false)
        expect(mergeable([STEP, STEP])).toBe(true)
        expect(mergeable([STEP, TURNS[0]])).toBe(false)
        expect(canWeave([STEP, STEP], "merged")).toBe(true)
        expect(canWeave([STEP, WALKS[1]], "merged")).toBe(false)
        expect(canWeave([TURNS[0], TURNS[1]], "random")).toBe(false)
    })

    test("a collage of a chain → made of the cards that can be held, none when none can", () => {
        expect(collageOf([STEP, TURNS[0], STEP])?.contents).toEqual([STEP, STEP])
        expect(collageOf([TURNS[0], STEP])).toBe(STEP)
        expect(collageOf([TURNS[0], WALKS[1]])).toBeNull()
        expect(collageOf([])).toBeNull()
    })
})

describe("a card with variants in the hand", () => {
    test("it stands for every variant: the chain may hold any, and the card of the hand is the one used", () => {
        const { on, hero } = holding(WALKS[1], STEP)
        on.commit(hero, new CardChain([WALKS[4], STEP]))
        expect(hero.hand).toEqual([])
    })

    test("a variant of another family, or a second one with one card in the hand → refused", () => {
        const { on, hero } = holding(WALKS[1])
        expect(() => on.commit(hero, new CardChain([TURNS[3]]))).toThrow(/not in the hand/)
        expect(() => on.commit(hero, new CardChain([WALKS[2], WALKS[3]]))).toThrow(/not in the hand/)
    })
})
