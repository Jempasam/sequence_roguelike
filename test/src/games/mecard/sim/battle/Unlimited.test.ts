import { describe, expect, test } from "vitest"
import {
    AIM, CARD_CODECS, cardsInHand, Heart, RED_HEART, STEP, TURN_STEPS, TURNS, Vector2, WAIT,
} from "@game/core/mecard"

import { battle, chain, HEROES, MONSTERS, unit } from "../fixtures"

// --- Fixtures ---

/** A battle and a unit of it that plays a step and the turns unlimited, with the given cards in hand. */
function unlimitedUnit(...hand: typeof STEP[]) {
    const on = battle()
    const hero = on.add({
        name: "hero", team: HEROES, controller: "player", position: new Vector2(3, 3), direction: Vector2.UP,
        hearts: Heart.many(RED_HEART, 4), decks: [[]], unlimited: [STEP, ...TURNS],
    })
    hero.hand.push(...hand)
    unit(on, 1, 1, { team: MONSTERS })
    on.startRound()
    return { on, hero }
}

// --- Tests ---

describe("unlimited cards", () => {
    test("committed with none in hand → accepted, the hand untouched, nothing played to discard", () => {
        const { on, hero } = unlimitedUnit(WAIT)
        on.commit(hero, chain(STEP, TURNS[4]))
        expect(hero.hand).toEqual([WAIT])
        on.endPreparation()
        on.playRound()
        expect(hero.decks.discards).toEqual([])
    })

    test("a card of hand and an unlimited one → the hand one leaves the hand, goes to discard", () => {
        const { on, hero } = unlimitedUnit(STEP)
        on.commit(hero, chain(STEP, STEP))
        expect(hero.hand).toEqual([])
        expect(on.cardsOf(hero)).toEqual([STEP])
    })

    test("committed again → the cards of hand come back, the unlimited ones never in the hand", () => {
        const { on, hero } = unlimitedUnit(WAIT)
        on.commit(hero, chain(WAIT, STEP))
        on.commit(hero, chain(STEP))
        expect(hero.hand).toEqual([WAIT])
    })

    test("the same unlimited card twice, none in hand → refused: once per round", () => {
        const { on, hero } = unlimitedUnit()
        expect(() => on.commit(hero, chain(STEP, STEP))).toThrow(/not in the hand/)
    })

    test("the same card three times, one in hand → refused, two are all there are", () => {
        const { on, hero } = unlimitedUnit(STEP)
        expect(() => on.commit(hero, chain(STEP, STEP, STEP))).toThrow(/not in the hand/)
    })

    test("two turns of different directions → refused: the turns are one unlimited card", () => {
        const { on, hero } = unlimitedUnit()
        expect(() => on.commit(hero, chain(TURNS[2], TURNS[6]))).toThrow(/not in the hand/)
    })

    test("a card neither in hand nor unlimited → refused", () => {
        const { on, hero } = unlimitedUnit()
        expect(() => on.commit(hero, chain(AIM))).toThrow(/not in the hand/)
    })

    test("a turn → the unit faces its direction", () => {
        const { on, hero } = unlimitedUnit()
        on.commit(hero, chain(TURNS[4]))
        on.endPreparation()
        on.playRound()
        expect(hero.direction.x).toBeCloseTo(1)
        expect(hero.direction.y).toBeCloseTo(0)
    })

    test("cards written down for a plan → found in the hand first, then among the unlimited ones", () => {
        const saved = [STEP, STEP, TURNS[3]].map(card => CARD_CODECS.save(card))
        expect(cardsInHand([STEP], saved, [STEP, ...TURNS])).toEqual([STEP, STEP, TURNS[3]])
        expect(() => cardsInHand([], saved)).toThrow()
    })
})

describe("the turn codec", () => {
    test("every step → written and read back as the same card", () => {
        for(let step = 0; step < TURN_STEPS; step++){
            expect(CARD_CODECS.load(CARD_CODECS.save(TURNS[step]))).toBe(TURNS[step])
        }
    })

    test("a step off the table → refused, as a save of another version", () => {
        expect(() => CARD_CODECS.load(`turned:${TURN_STEPS}`)).toThrow(/another version/)
        expect(() => CARD_CODECS.load("turned:-1")).toThrow(/another version/)
    })
})
