import { describe, expect, test } from "vitest"
import { Hand } from "@game/core"

import { Probe, uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A hand of cards of 20 by 10, stretched over a width of the main layer, laid out. */
function hand(setup: UiSetup, count: number, width: number, gap = 4): { hand: Hand, cards: Probe[] } {
    const made = new Hand({ gap })
    const cards = Array.from({ length: count }, (_, index) => new Probe(`card ${index}`, [20, 10], { interactive: true }))
    for(const card of cards) made.add(card)
    made.fixedSize = { width, height: 10 }
    setup.main.content.add(made)
    setup.ui.render()
    return { hand: made, cards }
}

/** Where each card starts, from the left of the hand. */
function lefts(cards: readonly Probe[]): number[] {
    return cards.map(card => card.bounds.x)
}

/** Let the interface tick for a while, long enough for an ease to end, then lay out and draw. */
function settle(setup: UiSetup): void {
    for(let frame = 0; frame < 60; frame++) setup.ui.update(1 / 60)
    setup.ui.render()
}

// --- Tests ---

describe("Hand", () => {
    test("room enough → side by side with the gap, centered", () => {
        const setup = uiSetup()
        const { cards } = hand(setup, 3, 100)
        expect(lefts(cards)).toEqual([16, 40, 64])
    })

    test("not room enough → overlapping, the first at the left edge and the last at the right one", () => {
        const setup = uiSetup()
        const { cards } = hand(setup, 5, 60)
        expect(lefts(cards)).toEqual([0, 10, 20, 30, 40])
    })

    test("a card pointed at near the end → the ones after it keep a strip, none under another", () => {
        const setup = uiSetup()
        const { cards } = hand(setup, 6, 80)
        setup.port.send({ type: "pointer-move", x: 40, y: 5 })
        setup.frame()
        settle(setup)
        const shown = lefts(cards)
        const strips = shown.slice(1).map((left, index) => left - shown[index])
        expect(Math.min(...strips)).toBeGreaterThanOrEqual(7)
    })

    test("showsAll → the widest whole, the last whole, a strip of the others", () => {
        const setup = uiSetup()
        const { hand: made } = hand(setup, 5, 60)
        // 20 + 4 + 20 + 3 strips of 10.
        expect(made.showsAll(74)).toBe(true)
        expect(made.showsAll(73)).toBe(false)
    })

    test("a card pointed at → whole, the ones after it spread on its right, then back once the pointer leaves", () => {
        const setup = uiSetup()
        const { cards } = hand(setup, 5, 60)
        setup.port.send({ type: "pointer-move", x: 12, y: 5 })
        setup.frame()
        settle(setup)
        expect(lefts(cards)).toEqual([0, 5, 29, 35, 40])
        setup.port.send({ type: "pointer-move", x: 200, y: 100 })
        setup.frame()
        settle(setup)
        expect(lefts(cards)).toEqual([0, 10, 20, 30, 40])
    })

    test("the card before the last pointed at → moved left to show whole, the ones before it gathered", () => {
        const setup = uiSetup()
        const { cards } = hand(setup, 5, 60)
        setup.port.send({ type: "pointer-move", x: 35, y: 5 })
        setup.frame()
        settle(setup)
        expect(lefts(cards)).toEqual([0, 5, 11, 16, 40])
    })

    test("any card pointed at → no card passes the next one", () => {
        const setup = uiSetup()
        const { cards } = hand(setup, 9, 80)
        for(let x = 1; x < 80; x += 3){
            setup.port.send({ type: "pointer-move", x, y: 5 })
            setup.frame()
            settle(setup)
            const at = lefts(cards)
            for(let index = 1; index < at.length; index++){
                expect(at[index]).toBeGreaterThanOrEqual(at[index - 1])
            }
        }
    })

    test("overlapping → the card drawn over the others is the one hit", () => {
        const setup = uiSetup()
        const { cards } = hand(setup, 5, 60)
        setup.port.send({ type: "pointer-move", x: 15, y: 5 }, { type: "pointer-down", button: 0, x: 15, y: 5 })
        setup.frame()
        expect(cards[1].events.some(event => event.startsWith("pointer-down"))).toBe(true)
    })
})
