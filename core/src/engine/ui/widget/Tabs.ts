import type { Component } from "../Component"
import { Box } from "../layout/Box"
import type { StateLooks, Theme } from "../Theme"
import { Button } from "./Button"

/** A page of tabs: the title of its tab, and what it shows, built each time it is shown. */
export interface TabPage {
    readonly title: string
    build(): Component
}

/** How tabs are set up beyond their theme and pages. */
export interface TabsOptions {
    /** The page shown first, the first by default. */
    readonly selected?: number

    /** The space between two tabs, and between the tabs and the page, in virtual pixels. */
    readonly gap?: number
}

/**
 * Pages one at a time under a row of tabs, one per page: a click on a tab shows its page. The tab of the
 * page shown keeps the pressed frame of the buttons.
 *
 * @remarks
 * A page is built when it is shown, and built again by {@link Tabs.refresh}, so it always shows the state
 * of now. What it built is taken out when another page is shown: a component kept from one build to the
 * next, a scroll, may be built again.
 */
export class Tabs extends Box {


    /** What a tab clicked does after its page is shown, nothing when none. */
    public onSelect: ((index: number) => void)|null = null

    /**
     * @throws {@link Error} When there is no page, or the page shown first is not one of them.
     */
    constructor(
        public readonly theme: Theme,
        pages: readonly TabPage[],
        options: TabsOptions = {},
    ){
        super("column", { gap: options.gap ?? 2, align: "stretch" })
        if(pages.length === 0) throw new Error("Tabs were made without a page.")
        this.#pages = [...pages]
        this.#selected = checkedIndex(options.selected ?? 0, pages.length)
        const button = theme.button
        const pressed = button.pressed
        this.#chosenLooks = { ...button, normal: pressed, hovered: pressed, focused: pressed }
        this.#header = new Box("row", { gap: options.gap ?? 2, align: "end" })
        this.add(this.#header)
        this.refresh()
    }


    /** The index of the page shown. Setting it shows that page. */
    public get selected(): number { return this.#selected }

    /**
     * @throws {@link Error} When it is not the index of a page.
     */
    public set selected(index: number){
        this.#selected = checkedIndex(index, this.#pages.length)
        this.refresh()
    }

    /** Build the tabs and the page shown again, from the state of now. */
    public refresh(): void {
        for(const tab of [...this.#header.children]) this.#header.remove(tab)
        this.#pages.forEach((page, index) => {
            const chosen = index === this.#selected
            const tab = new Button(this.theme, page.title, chosen ? { looks: this.#chosenLooks } : {})
            tab.onActivate = () => {
                if(index === this.#selected) return
                this.selected = index
                this.onSelect?.(index)
            }
            this.#header.add(tab)
        })
        if(this.#page) this.remove(this.#page)
        const page = this.#pages[this.#selected].build()
        page.parent?.remove(page)
        this.#page = page
        this.add(page, { grow: 1 })
    }


    readonly #pages: readonly TabPage[]
    readonly #header: Box
    readonly #chosenLooks: StateLooks & { readonly padding: number }
    #selected: number

    /** What the page shown built, none before the first. */
    #page: Component|null = null
}

/** An index checked to be one of a count. */
function checkedIndex(index: number, count: number): number {
    if(!Number.isInteger(index) || index < 0 || index >= count){
        throw new Error(`The tab ${index} was asked of ${count} tabs.`)
    }
    return index
}
