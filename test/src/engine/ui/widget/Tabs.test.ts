import { describe, expect, test } from "vitest"
import { Box, Label, Tabs } from "@game/core"
import type { Component } from "@game/core"

import { uiSetup } from "../../../fixtures/uiFixtures"
import type { UiSetup } from "../../../fixtures/uiFixtures"

// --- Fixture builders ---

/** Tabs of two pages, each a label, counting how many times each was built. */
function twoPages(setup: UiSetup, selected?: number): { tabs: Tabs, builds: number[], pages: Label[] } {
    const builds = [0, 0]
    const pages = [new Label(setup.theme, "one"), new Label(setup.theme, "two")]
    const tabs = new Tabs(setup.theme, [
        { title: "a", build: () => { builds[0]++; return pages[0] } },
        { title: "b", build: () => { builds[1]++; return pages[1] } },
    ], { selected })
    return { tabs, builds, pages }
}

/** The middle of a component, in the coordinates of the interface. */
function middleOf(component: Component): { x: number, y: number } {
    let x = component.bounds.width / 2
    let y = component.bounds.height / 2
    for(let each: Component|null = component; each; each = each.parent){
        x += each.bounds.x
        y += each.bounds.y
    }
    return { x: Math.floor(x), y: Math.floor(y) }
}

function click(setup: UiSetup, component: Component): void {
    const { x, y } = middleOf(component)
    setup.port.send({ type: "pointer-move", x, y }, { type: "pointer-down", button: 0, x, y })
    setup.port.send({ type: "pointer-up", button: 0, x, y })
    setup.frame()
}

/** The tab of a page. */
function tabOf(tabs: Tabs, index: number): Component {
    return (tabs.children[0] as Box).children[index]
}

// --- Tests ---

describe("Tabs", () => {
    test("made → a tab per page, the first page shown, only it built", () => {
        const setup = uiSetup()
        const { tabs, builds, pages } = twoPages(setup)
        expect((tabs.children[0] as Box).children).toHaveLength(2)
        expect(tabs.selected).toBe(0)
        expect(pages[0].parent).toBe(tabs)
        expect(builds).toEqual([1, 0])
    })

    test("a click on the second tab → its page shown in place of the first, told", () => {
        const setup = uiSetup()
        const { tabs, pages } = twoPages(setup)
        const selected: number[] = []
        tabs.onSelect = index => selected.push(index)
        setup.main.content.add(tabs)
        setup.ui.render()
        click(setup, tabOf(tabs, 1))
        expect(tabs.selected).toBe(1)
        expect(pages[1].parent).toBe(tabs)
        expect(pages[0].parent).toBeNull()
        expect(selected).toEqual([1])
    })

    test("a click on the tab of the page shown → nothing built again, nothing told", () => {
        const setup = uiSetup()
        const { tabs, builds } = twoPages(setup)
        let told = 0
        tabs.onSelect = () => told++
        setup.main.content.add(tabs)
        setup.ui.render()
        click(setup, tabOf(tabs, 0))
        expect(builds).toEqual([1, 0])
        expect(told).toBe(0)
    })

    test("refreshed → the page shown built again, the same component taken back", () => {
        const setup = uiSetup()
        const { tabs, builds, pages } = twoPages(setup, 1)
        tabs.refresh()
        expect(builds).toEqual([0, 2])
        expect(pages[1].parent).toBe(tabs)
        expect(tabs.children).toHaveLength(2)
    })

    test("no page, or a page shown that is not one → refused", () => {
        const setup = uiSetup()
        expect(() => new Tabs(setup.theme, [])).toThrow()
        expect(() => twoPages(setup, 2)).toThrow()
        const { tabs } = twoPages(setup)
        expect(() => { tabs.selected = -1 }).toThrow()
    })
})
