import { describe, expect, test } from "vitest"
import { Heart, RED_HEART, STEP, TURNS, Vector2, WAIT, WALKS } from "@game/core/mecard"
import { Draft } from "@game/core/mecard/draft"

import { battle, HEROES, MONSTERS, unit } from "../../sim/fixtures"

// --- Fixture builders ---

/** A draft for a hero facing a direction, playing a step and the turns unlimited, a wait in its hand. */
function draftOf(direction = Vector2.UP): Draft {
    const on = battle()
    const hero = on.add({
        name: "hero", team: HEROES, controller: "player", position: new Vector2(3, 3), direction,
        hearts: Heart.many(RED_HEART, 4), decks: [[]], unlimited: [STEP, ...TURNS],
    })
    hero.hand.push(WAIT)
    unit(on, 1, 1, { team: MONSTERS })
    return new Draft(hero)
}

// --- Tests ---

describe("Draft, the cards played unlimited", () => {
    test("the turn shown → the one facing nearest to the unit at first", () => {
        expect(draftOf(Vector2.UP).unlimited).toEqual([STEP, TURNS[0]])
        expect(draftOf(Vector2.RIGHT).unlimited).toEqual([STEP, TURNS[8]])
        expect(draftOf(Vector2.DOWN).unlimited).toEqual([STEP, TURNS[16]])
    })

    test("a step and one turn shown, in the order of the unit", () => {
        const draft = draftOf()
        expect(draft.choose(TURNS[5])).toBe(true)
        expect(draft.unlimited).toEqual([STEP, TURNS[5]])
    })

    test("a variant the unit does not play unlimited → not chosen", () => {
        const draft = draftOf()
        expect(draft.choose(WALKS[3])).toBe(false)
        expect(draft.unlimited).toEqual([STEP, TURNS[0]])
    })

    test("a family of which the unit plays one only → that one shown, chosen or not", () => {
        const draft = draftOf()
        draft.unit.unlimited.splice(0, draft.unit.unlimited.length, STEP, WALKS[3], WALKS[1])
        expect(draft.unlimited).toEqual([STEP, WALKS[1]])
        draft.unit.unlimited.splice(0, draft.unit.unlimited.length, STEP, WALKS[3])
        expect(draft.unlimited).toEqual([STEP, WALKS[3]])
    })

    test("placing one → the hand untouched, the card used up for the round", () => {
        const draft = draftOf()
        expect(draft.isUsed(STEP)).toBe(false)
        expect(draft.place(STEP)).toBe("placed")
        expect(draft.chain.cards).toEqual([STEP])
        expect(draft.available).toEqual([WAIT])
        expect(draft.isUsed(STEP)).toBe(true)
        expect(draft.unlimited).toContain(STEP)
    })

    test("a turn placed → every turn used up, whichever way the dial points", () => {
        const draft = draftOf()
        draft.place(TURNS[0])
        expect(draft.isUsed(TURNS[0])).toBe(true)
        expect(draft.isUsed(TURNS[5])).toBe(true)
        expect(draft.isUsed(STEP)).toBe(false)
    })

    test("a card both in hand and unlimited → the unlimited one used first, the hand one kept until the second", () => {
        const draft = draftOf()
        draft.unit.hand.push(STEP)
        draft.place(STEP)
        expect(draft.available).toEqual([WAIT, STEP])
        draft.place(STEP)
        expect(draft.available).toEqual([WAIT])
    })

    test("a turn of the chain → changed for another variant, in its place", () => {
        const draft = draftOf()
        draft.place(STEP)
        draft.place(TURNS[0])
        expect(draft.variant(1, TURNS[6])).toBe(true)
        expect(draft.chain.cards).toEqual([STEP, TURNS[6]])
    })

    test("a card with no variants, no card, a variant of another family or one not played → not changed", () => {
        const draft = draftOf()
        draft.place(STEP)
        expect(draft.variant(0, TURNS[3])).toBe(false)
        expect(draft.variant(5, TURNS[3])).toBe(false)
        draft.place(TURNS[0])
        expect(draft.variant(1, WALKS[1])).toBe(false)
        draft.unit.unlimited.splice(0, draft.unit.unlimited.length, STEP, TURNS[0])
        expect(draft.variant(1, TURNS[3])).toBe(false)
        expect(draft.chain.cards).toEqual([STEP, TURNS[0]])
    })

    test("a card with variants in the hand → shown as the one chosen, placed as it, used up once", () => {
        const draft = draftOf()
        draft.unit.hand.push(WALKS[1])
        expect(draft.shown(WALKS[1])).toBe(WALKS[1])
        expect(draft.choose(WALKS[3])).toBe(true)
        expect(draft.shown(WALKS[1])).toBe(WALKS[3])
        draft.place(draft.shown(WALKS[1]))
        expect(draft.available).toEqual([WAIT])
        draft.place(WALKS[4])
        expect(draft.chain.cards).toEqual([WALKS[3], WALKS[4]])
        expect(draft.variant(0, WALKS[0])).toBe(false)
    })

    test("a variant in the chain of a card of the hand → changed for another, in its place", () => {
        const draft = draftOf()
        draft.unit.hand.push(WALKS[1])
        draft.place(WALKS[1])
        expect(draft.variant(0, WALKS[4])).toBe(true)
        expect(draft.chain.cards).toEqual([WALKS[4]])
    })
})
