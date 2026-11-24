import { Bar, Box, Button, Scroll, WrapBox } from "../../../../engine/ui"
import type { Theme } from "../../../../engine/ui"

import type { CatalogCategory } from "../../sim/save/catalogSave"
import type { Section } from "../library/entries"

/** The height of the bar between two groups of tabs, about a tab's. */
const BAR_HEIGHT = 14

/** How a row of tabs is set up. */
export interface SectionTabsOptions {
    /** How wide the row is, in virtual pixels: asked each time it is made again. */
    readonly width: () => number

    /** The types of things that may be searched, none to offer them all. */
    readonly allowed?: ReadonlySet<CatalogCategory>|null
}

/**
 * The row of tabs that tells which type of thing the catalogue lists: one tab for each section, a bar between
 * two groups, the row scrolling sideways when it is too long.
 */
export class SectionTabs extends Box {


    /** What it does when a tab is clicked, with the section and its place among the tabs. */
    public onSelect: ((section: Section, index: number) => void)|null = null

    constructor(
        public readonly theme: Theme,
        sections: readonly Section[],
        private readonly options: SectionTabsOptions,
    ){
        super("column", { align: "stretch" })
        const allowed = options.allowed ?? null
        this.#sections = allowed ? sections.filter(section => allowed.has(section.category)) : [...sections]
        this.refresh()
    }


    /** The sections offered, in the order of the tabs. */
    public get sections(): readonly Section[] { return this.#sections }

    /** The place of the tab chosen. Setting it shows that tab as chosen, and tells nothing. */
    public get selected(): number { return this.#selected }

    public set selected(index: number){
        if(index < 0 || index >= this.#sections.length || index === this.#selected) return
        this.#selected = index
        this.#style()
    }

    /** The section of the tab chosen, none when no section is offered. */
    public get section(): Section|null { return this.#sections[this.#selected] ?? null }

    /** Build the row again, for the width of now. */
    public refresh(): void {
        for(const child of [...this.children]) this.remove(child)
        // A wrapping box, so the tabs sit in the middle when they fit, and scroll when they do not.
        const row = new WrapBox({ gap: 2 })
        this.#buttons = []
        this.#sections.forEach((section, index) => {
            if(index > 0 && section.group !== this.#sections[index - 1].group){
                // A thin bar as high as a tab marks where a group ends.
                row.add(new Bar(2, BAR_HEIGHT))
            }
            const tab = new Button(this.theme, section.title)
            tab.onActivate = () => {
                if(index === this.#selected) return
                this.selected = index
                this.onSelect?.(section, index)
            }
            this.#buttons.push(tab)
            row.add(tab)
        })
        this.#style()
        const height = row.measure(Infinity).preferredHeight + this.theme.scrollbar.width
        const scroll = new Scroll(this.theme, { axis: "horizontal", width: this.options.width(), height, wheel: true })
        scroll.content = row
        this.add(scroll)
    }


    readonly #sections: readonly Section[]
    #buttons: Button[] = []
    #selected = 0

    /** Show the chosen tab as pressed, the others as normal buttons. */
    #style(): void {
        const button = this.theme.button
        const pressed = button.pressed
        const chosenLooks = { ...button, normal: pressed, hovered: pressed, focused: pressed }
        this.#buttons.forEach((tab, index) => {
            tab.looks = index === this.#selected ? chosenLooks : button
        })
    }
}
