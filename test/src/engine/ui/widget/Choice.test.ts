import { describe, expect, test } from "vitest"
import { Choice, Container, OverflowContainer, Scroll } from "@game/core"
import type { ChoiceStep, Component } from "@game/core"

import { Probe, uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** A step of three options of 20 by 10, named after the picks before them. */
function step(picks: readonly number[]): ChoiceStep {
    const options = [0, 1, 2].map(index => new Probe(`${picks.join("")}${index}`, [20, 10], { interactive: true }))
    return { title: null, options }
}

/** A choice of two steps over the main layer, laid out, and the picks it was done with, none yet. */
function twoSteps(setup: UiSetup): { choice: Choice, done: (readonly number[])[] } {
    const done: (readonly number[])[] = []
    const next = (picks: readonly number[]) => picks.length < 2 ? step(picks) : null
    const choice = new Choice(setup.theme, next, picks => done.push(picks), { gap: 4, spacing: 6 })
    setup.main.content.add(choice, { x: "stretch", y: "start" })
    setup.ui.render()
    return { choice, done }
}

/** Click the middle of an option of a step. */
function pick(setup: UiSetup, choice: Choice, depth: number, index: number): void {
    const option = choiceSteps(choice)[depth][index]
    let x = option.bounds.x + option.bounds.width / 2
    let y = option.bounds.y + option.bounds.height / 2
    for(let parent = option.parent; parent; parent = parent.parent){
        x += parent.bounds.x
        y += parent.bounds.y
    }
    setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
    setup.port.send({ type: "pointer-up", button: 0, x, y })
    setup.frame()
    setup.ui.render()
}

/** The first component of a kind under a component, itself included. */
function find<T extends Component>(component: Component, kind: abstract new (...args: never[]) => T): T|null {
    if(component instanceof kind) return component
    if(!(component instanceof Container)) return null
    for(const child of component.children){
        const found = find(child, kind)
        if(found) return found
    }
    return null
}

/** The options of each step shown, from their hands. */
function choiceSteps(choice: Choice): (readonly Component[])[] {
    const column = choice.content
    if(!(column instanceof Container)) throw new Error("A choice holds a column of steps.")
    return column.children.map(each => {
        const hand = find(each, OverflowContainer)
        if(!hand) throw new Error("A step of a choice holds a hand of options.")
        return hand.children
    })
}

/** A choice of one step of options of a size, over the main layer, laid out, and what it scrolls with. */
function wideOptions(setup: UiSetup, sizes: readonly [number, number][]): { choice: Choice, scroll: Scroll } {
    const options = sizes.map((size, index) => new Probe(`${index}`, size, { interactive: true }))
    const next = (picks: readonly number[]) => picks.length === 0 ? { title: null, options } : null
    const choice = new Choice(setup.theme, next, () => {}, { gap: 4 })
    setup.main.content.add(choice, { x: "stretch", y: "start" })
    setup.ui.render()
    const scroll = find(choice, Scroll)
    if(!scroll) throw new Error("A step of a choice holds a scroll.")
    return { choice, scroll }
}

// --- Tests ---

describe("Choice", () => {
    test("an option holding overlapped cards, one pointed at → it shows whole though the option holds the pointer", () => {
        const setup = uiSetup()
        const inner = new OverflowContainer({ minOverflow: 8, maxOverflow: 8 })
        const cards = Array.from({ length: 5 }, (_, index) => new Probe(`card ${index}`, [20, 10], { interactive: true }))
        for(const card of cards) inner.add(card)
        const next = (picks: readonly number[]) => picks.length === 0 ? { title: null, options: [inner] } : null
        const choice = new Choice(setup.theme, next, () => {}, { gap: 4 })
        setup.main.content.add(choice, { x: "stretch", y: "start" })
        setup.ui.render()
        const before = cards.map(card => card.bounds.x)
        let x = cards[1].bounds.x + 2
        let y = cards[1].bounds.y + 5
        for(let parent: Component|null = cards[1].parent; parent; parent = parent.parent){
            x += parent.bounds.x
            y += parent.bounds.y
        }
        setup.port.send({ type: "pointer-move", x, y })
        setup.frame()
        for(let frame = 0; frame < 60; frame++) setup.ui.update(1 / 60)
        setup.ui.render()
        const after = cards.map(card => card.bounds.x)
        expect(after[2] - after[1]).toBeGreaterThanOrEqual(20)
        expect(before[2] - before[1]).toBeLessThan(20)
    })

    test("first shown → one step of options", () => {
        const setup = uiSetup()
        const { choice } = twoSteps(setup)
        expect(choiceSteps(choice)).toHaveLength(1)
        expect(choice.picks).toEqual([])
    })

    test("an option picked → the next step under it, then the last picked → done with both picks", () => {
        const setup = uiSetup()
        const { choice, done } = twoSteps(setup)
        pick(setup, choice, 0, 2)
        expect(choiceSteps(choice)).toHaveLength(2)
        expect(done).toEqual([])
        pick(setup, choice, 1, 0)
        expect(done).toEqual([[2, 0]])
    })

    test("an earlier step picked again → the steps after it offered anew", () => {
        const setup = uiSetup()
        const { choice, done } = twoSteps(setup)
        pick(setup, choice, 0, 2)
        pick(setup, choice, 0, 1)
        expect(choice.picks).toEqual([1])
        expect(choiceSteps(choice)).toHaveLength(2)
        expect(done).toEqual([])
    })

    test("no first step → an error", () => {
        expect(() => new Choice(uiSetup().theme, () => null, () => {})).toThrow()
    })

    test("options fitting → side by side, nothing to scroll", () => {
        const { scroll } = wideOptions(uiSetup(), [[20, 10], [20, 10], [20, 10]])
        expect(scroll.overflows).toBe(false)
    })

    test("options too wide to sit side by side but under the limit → they overlap, nothing to scroll", () => {
        const { choice, scroll } = wideOptions(uiSetup(), [[120, 10], [120, 10], [120, 10]])
        expect(scroll.overflows).toBe(false)
        const [first, second] = choiceSteps(choice)[0]
        expect(second.bounds.x).toBeLessThan(first.bounds.x + first.bounds.width)
    })

    test("many options, each hidden under the others when one shows whole → side by side in a scroll", () => {
        const sizes = Array.from({ length: 14 }, (): [number, number] => [60, 10])
        const { scroll } = wideOptions(uiSetup(), sizes)
        expect(scroll.overflows).toBe(true)
    })

    test("options over the limit → side by side in a scroll, none overlapping", () => {
        const { choice, scroll } = wideOptions(uiSetup(), [[200, 10], [200, 10], [200, 10]])
        expect(scroll.overflows).toBe(true)
        const [first, second] = choiceSteps(choice)[0]
        expect(second.bounds.x).toBeGreaterThanOrEqual(first.bounds.x + first.bounds.width)
    })

    test("over the limit, scrolled → the option under the pointer is the one picked", () => {
        const setup = uiSetup()
        const { choice, scroll } = wideOptions(setup, [[200, 10], [200, 10], [200, 10]])
        scroll.offset = 1000
        setup.ui.render()
        const last = choiceSteps(choice)[0][2]
        const x = last.bounds.x - scroll.offset + last.bounds.width / 2
        const y = last.bounds.height / 2
        setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
        setup.frame()
        expect(choice.picks).toEqual([2])
    })

    test("one option wider than the choice → it scrolls, drawn whole as it wobbles", () => {
        const setup = uiSetup({ debug: true })
        const { scroll } = wideOptions(setup, [[400, 10]])
        expect(scroll.overflows).toBe(true)
        for(let frame = 0; frame < 30; frame++){
            setup.ui.update(1 / 60)
            expect(() => setup.ui.render()).not.toThrow()
        }
    })

    test("shown → it wobbles, drawn with no error in debug", () => {
        const setup = uiSetup({ debug: true })
        twoSteps(setup)
        for(let frame = 0; frame < 30; frame++){
            setup.ui.update(1 / 60)
            expect(() => setup.ui.render()).not.toThrow()
        }
    })
})
