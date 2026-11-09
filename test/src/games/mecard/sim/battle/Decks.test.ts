import { describe, expect, test } from "vitest"
import {
    AIM, Arena, BACK_DASH, Battle, CardChain, Heart, loadBattle, RED_HEART, saveBattle, SLASH, STEP,
    THRUST, TURNS, Vector2, WAIT,
} from "@game/core/mecard"
import type { Card, Unit } from "@game/core/mecard"
import { HEROES, MONSTERS, unit } from "../fixtures"

// --- Fixture builders ---

/** A unit with some decks, in order, drawing a number of cards each round, in a battle with a foe. */
function drawing(
    decks: readonly (readonly Card[])[], draw: number, handSize = 10,
): { on: Battle, drawer: Unit } {
    const on = new Battle(new Arena(7, 7), 1)
    const drawer = on.add({
        name: "drawer", team: HEROES, controller: "player", position: new Vector2(3, 5), direction: Vector2.UP,
        hearts: Heart.many(RED_HEART, 2), decks,
        bases: { draw, firstDraw: draw, ordered: true, handSize },
    })
    unit(on, 1, 1, { team: MONSTERS })
    return { on, drawer }
}

/** Go to the next round, the cards of a unit left in hand. */
function nextRound(on: Battle): void {
    on.endPreparation()
    on.playRound()
    on.startRound()
}

// --- Tests ---

describe("Decks", () => {
    test("three decks → one card of each in turn, from the first to the last", () => {
        const { on, drawer } = drawing([[STEP, STEP], [AIM, AIM], [WAIT, WAIT]], 5)
        on.startRound()
        expect(drawer.hand).toEqual([STEP, AIM, WAIT, STEP, AIM])
    })

    test("a deck with nothing to draw → passed", () => {
        const { on, drawer } = drawing([[STEP], [], [AIM, AIM]], 3)
        on.startRound()
        expect(drawer.hand).toEqual([STEP, AIM, AIM])
    })

    test("a round over → the next draw goes on where the last one stopped", () => {
        const { on, drawer } = drawing([[STEP, STEP], [AIM, AIM]], 1)
        on.startRound()
        expect(drawer.decks.cursor).toBe(1)
        nextRound(on)
        expect(drawer.hand).toEqual([STEP, AIM])
    })

    test("a full hand → the turn kept for the next card", () => {
        const { on, drawer } = drawing([[STEP, STEP], [AIM, AIM]], 5, 1)
        on.startRound()
        expect(drawer.hand).toEqual([STEP])
        expect(drawer.decks.cursor).toBe(1)
    })

    test("no deck → nothing drawn", () => {
        const { on, drawer } = drawing([], 5)
        on.startRound()
        expect(drawer.hand).toEqual([])
    })

    test("a card played → back in the discard of its own deck", () => {
        const { on, drawer } = drawing([[STEP], [AIM]], 2)
        on.startRound()
        on.commit(drawer, new CardChain([AIM]))
        on.endPreparation()
        on.playRound()
        expect(drawer.decks.all.map(deck => deck.discard)).toEqual([[], [AIM]])
    })
})

describe("Decks, on their own", () => {
    const fresh = (lists: readonly (readonly Card[])[]): { decks: Unit["decks"], rng: Battle["rng"] } => {
        const { on, drawer } = drawing(lists, 0)
        return { decks: drawer.decks, rng: on.rng }
    }

    test("a card drawn then discarded → back in the deck it came from", () => {
        const { decks, rng } = fresh([[STEP], [AIM]])
        decks.draw(rng)
        decks.draw(rng)
        expect(decks.discard(AIM)).toBe(1)
        expect(decks.discard(STEP)).toBe(0)
        expect(decks.all.map(deck => deck.discard)).toEqual([[STEP], [AIM]])
    })

    test("two copies from two decks → one back in each, whichever goes first", () => {
        const { decks, rng } = fresh([[STEP], [STEP]])
        decks.draw(rng)
        decks.draw(rng)
        decks.discard(STEP)
        decks.discard(STEP)
        expect(decks.all.map(deck => deck.discard.length)).toEqual([1, 1])
    })

    test("a card from elsewhere → the first deck", () => {
        const { decks } = fresh([[STEP], [AIM]])
        expect(decks.discard(THRUST)).toBe(0)
        expect(decks.all[0].discard).toEqual([THRUST])
    })

    test("a card from elsewhere, no deck → lost", () => {
        const { decks } = fresh([])
        expect(decks.discard(THRUST)).toBeNull()
    })

    test("a pile run out → its discard put back, told, and only for that deck", () => {
        const { decks, rng } = fresh([[STEP], [AIM]])
        decks.draw(rng)
        decks.discard(STEP)
        decks.cursor = 0
        expect(decks.draw(rng)).toEqual({ card: STEP, deck: 0, recycled: true })
        expect(decks.all[1].pile).toEqual([AIM])
    })

    test("a card taken from a pile → its deck remembered, the turn kept", () => {
        const { decks } = fresh([[STEP], [AIM, TURNS[4]]])
        expect(decks.take(1, 0)).toBe(TURNS[4])
        expect(decks.cursor).toBe(0)
        expect(decks.homes).toEqual([[TURNS[4], 1]])
    })
})

describe("Decks, telling where a card goes back", () => {
    test("copies of a card from two decks → each deck told once, then none", () => {
        const { on, drawer } = drawing([[STEP], [STEP]], 2)
        on.startRound()
        const deckOf = drawer.decks.homeTeller()
        expect([deckOf(STEP), deckOf(STEP), deckOf(STEP)]).toEqual([0, 1, null])
    })

    test("a card from elsewhere → none", () => {
        const { drawer } = drawing([[STEP]], 0)
        expect(drawer.decks.homeTeller()(AIM)).toBeNull()
    })
})

describe("Decks, saved", () => {
    test("two decks, a turn and cards in hand → loaded back, drawing and discarding the same", () => {
        const { on, drawer } = drawing([[STEP, SLASH, BACK_DASH], [AIM, WAIT, THRUST]], 3)
        on.startRound()
        const save = saveBattle(on)
        const back = loadBattle(save)
        const loaded = back.units[0]
        expect(loaded.decks.cursor).toBe(drawer.decks.cursor)
        expect(loaded.decks.homes).toEqual(drawer.decks.homes)
        expect(saveBattle(back)).toEqual(save)
        nextRound(on)
        nextRound(back)
        expect(saveBattle(back)).toEqual(saveBattle(on))
    })
})
