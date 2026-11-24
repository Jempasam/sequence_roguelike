import { Box, Label, TextInput } from "../../../../engine/ui"
import type { Theme } from "../../../../engine/ui"

import type { PlayerCatalog } from "../../persist/PlayerCatalog"
import type { CatalogCategory } from "../../sim/save/catalogSave"
import type { Detail } from "../hud/Detail"
import type { Entry, EntryFilter, Section } from "../library/entries"
import { DIM_TEXT } from "../look/theme"

import { CatalogList } from "./CatalogList"
import { FilterBar } from "./FilterBar"
import { SectionTabs } from "./SectionTabs"

/** The space around and between the parts, in virtual pixels. */
const GAP = 4

/** How wide the search field is, in virtual pixels. */
const SEARCH_WIDTH = 80

/** How a browser is set up beyond its theme. */
export interface CatalogBrowserOptions {
    /** The tabs it offers. */
    readonly sections: readonly Section[]

    /** How wide it is, in virtual pixels: asked each time it is made again. */
    readonly width: () => number

    /** The types of things that may be searched, none to offer them all. */
    readonly allowed?: ReadonlySet<CatalogCategory>|null

    /** Filters offered on every tab, beside those of the tab. */
    readonly filters?: readonly EntryFilter[]

    /** What the player found, none for a browser that cannot tell. */
    readonly unlocked?: PlayerCatalog|null

    /** Does it offer a toggle to list only what was found? No by default: the owner sets `playerOnly`. */
    readonly unlockedToggle?: boolean

    /** The only keys it lists, none to list them all. */
    readonly keys?: ReadonlySet<string>|null
}

/**
 * The part of the interface that chooses a thing in the catalogue: a search field, the filters, the tabs that
 * tell which type of thing is searched, and the entries. It can be put in any screen, and makes no bubble:
 * `onDetail` gives what the entries hover to the owner, which says it where it wishes.
 */
export class CatalogBrowser extends Box {


    /** What it does with what the entries hover, each time the list is made again. */
    public onDetail: ((detail: Detail) => void)|null = null

    constructor(
        public readonly theme: Theme,
        options: CatalogBrowserOptions,
    ){
        super("column", { gap: GAP, align: "stretch" })
        this.#extra = options.filters ?? []
        // The field lives as long as the browser, so it keeps the focus while the list is made again.
        this.search = new TextInput(theme, { maxLength: 40 })
        this.search.fixedSize = { width: SEARCH_WIDTH, height: this.search.measure(Infinity).preferredHeight }
        this.count = new Label(theme, "", { color: DIM_TEXT })
        this.filterBar = new FilterBar(theme, options.unlockedToggle ?? false)
        this.tabs = new SectionTabs(theme, options.sections, {
            width: options.width, allowed: options.allowed,
        })
        this.list = new CatalogList(theme, this.tabs.section ?? EMPTY, {
            unlocked: options.unlocked ?? null, width: options.width,
        })
        this.list.keys = options.keys ?? null
        this.list.onCount = (shown, total) => {
            this.count.text = this.list.playerOnly ? `${shown}/${total}` : `${shown}`
        }
        this.list.onDetail = detail => this.onDetail?.(detail)
        this.search.onChange = text => {
            this.list.query = text
        }
        this.filterBar.onChange = () => {
            this.list.playerOnly = this.filterBar.unlocked || this.#playerOnly
            this.list.filters = this.filterBar.active
        }
        this.tabs.onSelect = () => this.#showSection()
        const top = new Box("row", { gap: GAP, align: "center" })
        top.add(this.search)
        top.add(this.count)
        top.add(this.filterBar)
        this.add(top)
        this.add(this.tabs)
        this.add(this.list, { grow: 1 })
        this.#showSection()
    }


    /** The search field: its owner may put it elsewhere than where the browser does. */
    public readonly search: TextInput

    /** How many entries are listed. */
    public readonly count: Label
    public readonly filterBar: FilterBar
    public readonly tabs: SectionTabs
    public readonly list: CatalogList

    /** The sections offered, in the order of the tabs. */
    public get sections(): readonly Section[] { return this.tabs.sections }

    /** The place of the tab shown. Setting it shows that tab. */
    public get selected(): number { return this.tabs.selected }

    public set selected(index: number){
        if(index < 0 || index >= this.tabs.sections.length || index === this.tabs.selected) return
        this.tabs.selected = index
        this.#showSection()
    }

    /** The section shown, none when no section is offered. */
    public get section(): Section|null { return this.tabs.section }

    /** Does it list only what the player found? Needs a catalogue of the player. */
    public get playerOnly(): boolean { return this.list.playerOnly }

    public set playerOnly(only: boolean){
        this.#playerOnly = only
        this.list.playerOnly = only || this.filterBar.unlocked
    }

    /** What it does when an entry is clicked: with it, entries can be picked, else they are only shown. */
    public get onPick(): ((section: Section, entry: Entry) => void)|null { return this.#onPick }

    public set onPick(onPick: ((section: Section, entry: Entry) => void)|null){
        this.#onPick = onPick
        this.list.onPick = onPick
            ? entry => {
                const section = this.section
                if(section) onPick(section, entry)
            }
            : null
        this.list.refresh()
    }

    /** Make the tabs and the list again, for the width and the state of now. */
    public refresh(): void {
        this.tabs.refresh()
        this.list.refresh()
    }


    #playerOnly = false
    #onPick: ((section: Section, entry: Entry) => void)|null = null
    readonly #extra: readonly EntryFilter[]

    /** List the entries of the tab shown, with the filters it offers. */
    #showSection(): void {
        const section = this.tabs.section
        this.filterBar.filters = [...section?.filters ?? [], ...this.#extra]
        this.list.use(section ?? EMPTY, this.filterBar.active)
    }
}

/** What a browser with no section lists. */
const EMPTY = { category: null, entries: () => [] as readonly Entry[] }
