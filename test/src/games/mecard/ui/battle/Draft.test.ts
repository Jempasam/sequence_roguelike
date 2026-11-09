import { describe, expect, test } from "vitest"
import { Heart, RED_HEART, STEP, TURNS, Vector2, WAIT } from "@game/core/mecard"
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
        expect(draftOf(Vector2.UP).turnStep).toBe(0)
        expect(draftOf(Vector2.RIGHT).turnStep).toBe(4)
        expect(draftOf(Vector2.DOWN).unlimited).toEqual([STEP, TURNS[8]])
    })

    test("a step and one turn shown, in the order of the unit", () => {
        const draft = draftOf()
        draft.turnStep = 5
        expect(draft.unlimited).toEqual([STEP, TURNS[5]])
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

    test("a turn of the chain → pointed at another step, in its place", () => {
        const draft = draftOf()
        draft.place(STEP)
        draft.place(TURNS[0])
        expect(draft.turn(1, 6)).toBe(true)
        expect(draft.chain.cards).toEqual([STEP, TURNS[6]])
    })

    test("a card that is no turn, or a step off the table → not turned", () => {
        const draft = draftOf()
        draft.place(STEP)
        expect(draft.turn(0, 3)).toBe(false)
        expect(draft.turn(5, 3)).toBe(false)
        draft.place(TURNS[0])
        expect(draft.turn(1, 40)).toBe(false)
        expect(draft.chain.cards).toEqual([STEP, TURNS[0]])
    })
})
