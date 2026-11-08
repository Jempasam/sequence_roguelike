import { describe, expect, test } from "vitest"
import { OverflowContainer } from "@game/core"

import { Probe, uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A hand of cards of 20 by 10, stretched over a width of the main layer, laid out. */
function hand(setup: UiSetup, count: number, width: number, gap = 4): { hand: OverflowContainer, cards: Probe[] } {
    const made = new OverflowContainer({ gap })
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

describe("OverflowContainer", () => {
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

    test("min and max overflow → the width asked for at least and at best", () => {
        const setup = uiSetup()
        const made = new OverflowContainer({ gap: 4, minOverflow: 6, maxOverflow: 12, strip: 2 })
        for(let index = 0; index < 4; index++) made.add(new Probe(`card ${index}`, [20, 10]))
        setup.main.content.add(made)
        setup.ui.render()
        // 4 cards of 20, 3 gaps of 4, 3 overflows of 6 at best and of 12 at least.
        expect(made.measure(Infinity).preferredWidth).toBe(80 + 12 - 18)
        expect(made.measure(Infinity).minWidth).toBe(80 + 12 - 36)
    })

    test("min = max overflow → the same overflow at any width, as wide as the cards ask", () => {
        const setup = uiSetup()
        const made = new OverflowContainer({ minOverflow: 7, maxOverflow: 7 })
        const cards = [20, 40, 30].map(width => new Probe(`card ${width}`, [width, 10]))
        for(const card of cards) made.add(card)
        expect(made.measure(Infinity).preferredWidth).toBe(90 - 14)
        expect(made.measure(Infinity).minWidth).toBe(90 - 14)
        made.fixedSize = { width: 76, height: 10 }
        setup.main.content.add(made)
        setup.ui.render()
        expect(lefts(cards)).toEqual([0, 13, 46])
    })

    test("a card narrower than the others → overflowed by the same distance, not hidden", () => {
        const setup = uiSetup()
        const made = new OverflowContainer({ strip: 4 })
        const cards = [40, 12, 40].map(width => new Probe(`card ${width}`, [width, 10]))
        for(const card of cards) made.add(card)
        made.fixedSize = { width: 60, height: 10 }
        setup.main.content.add(made)
        setup.ui.render()
        // 92 wide side by side in 60 would take 16 of overflow, but the narrow one keeps 4: 12 − 4 = 8 at most.
        expect(lefts(cards)).toEqual([0, 32, 36])
        expect(cards[0].bounds.x + 40 - cards[1].bounds.x).toBe(8)
        expect(cards[1].bounds.x + 12 - cards[2].bounds.x).toBe(8)
    })

    test("more to overflow than the most → scrolls, at the most overflow", () => {
        const setup = uiSetup()
        const { hand: made, cards } = hand(setup, 5, 60)
        // 5 cards of 20 and 4 gaps of 4, each overflowing by 20 + 4 − 10 of strip at most.
        expect(made.scrolls(60)).toBe(false)
        expect(made.scrolls(59)).toBe(true)
        expect(cards).toHaveLength(5)
    })

    test("a fixed overflow, a card pointed at → whole, the others kept inside the same width", () => {
        const setup = uiSetup()
        const made = new OverflowContainer({ minOverflow: 8, maxOverflow: 8 })
        const cards = Array.from({ length: 5 }, (_, index) => new Probe(`card ${index}`, [20, 10], { interactive: true }))
        for(const card of cards) made.add(card)
        // 5 cards of 20, 4 overflows of 8: 68 wide.
        made.fixedSize = { width: 68, height: 10 }
        setup.main.content.add(made)
        setup.ui.render()
        expect(lefts(cards)).toEqual([0, 12, 24, 36, 48])
        setup.port.send({ type: "pointer-move", x: 14, y: 5 })
        setup.frame()
        settle(setup)
        const shown = lefts(cards)
        expect(shown[2] - shown[1]).toBeGreaterThanOrEqual(20)
        expect(Math.max(...shown) + 20).toBeLessThanOrEqual(68)
    })

    test("not enough room even at the most overflow → the wheel scrolls the cards, up to their end", () => {
        const setup = uiSetup()
        const { cards } = hand(setup, 5, 40)
        // 60 wide at the most overflow (14 each), in 40: 20 to scroll.
        expect(lefts(cards)).toEqual([0, 10, 20, 30, 40])
        const made = cards[0].parent as OverflowContainer
        expect(made.offset).toBe(0)
        setup.port.send({ type: "pointer-move", x: 5, y: 5 }, { type: "wheel", dx: 0, dy: 1 })
        setup.frame()
        setup.ui.render()
        expect(made.offset).toBe(16)
        setup.port.send({ type: "wheel", dx: 0, dy: 10 })
        setup.frame()
        setup.ui.render()
        expect(made.offset).toBe(20)
    })

    test("a single card → centered, no overflow", () => {
        const setup = uiSetup()
        const { cards } = hand(setup, 1, 60)
        expect(lefts(cards)).toEqual([20])
    })
})
