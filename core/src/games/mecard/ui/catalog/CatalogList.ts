import { Color } from "../../../../engine/math"
import { Box, Button, Container, NineSlice, Panel, Scroll, WrapBox } from "../../../../engine/ui"
import type { Component, StateLooks, Theme } from "../../../../engine/ui"
import { plainText } from "../../../../semantic"

import type { PlayerCatalog } from "../../persist/PlayerCatalog"
import type { CatalogCategory } from "../../sim/save/catalogSave"
import { CardView } from "../hud/CardView"
import { Detail } from "../hud/Detail"
import { viewDetails } from "../hud/viewDetails"
import type { Entry, EntryFilter } from "../library/entries"

/** The space between two entries, in virtual pixels. */
const GAP = 4

/** The views of cards in a component, at any depth. */
function cardViewsUnder(root: Component): CardView[] {
    const found: CardView[] = root instanceof CardView ? [root] : []
    if(root instanceof Container) for(const child of root.children) found.push(...cardViewsUnder(child))
    return found
}

/** A text in lower case without accents, to compare what is typed with what is written. */
export function simplified(text: string): string {
    return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
}

/** Where a list takes its entries from: a tab of the catalogue is one. */
export interface CatalogSource {
    /** What the catalogue of the player counts its entries as, none for entries it does not count. */
    readonly category: CatalogCategory|null
    entries(): readonly Entry[]
}

/** How a list is set up beyond its theme and its source. */
export interface CatalogListOptions {
    /** What the player found, none for a list that cannot tell. */
    readonly unlocked?: PlayerCatalog|null

    /** How wide the list is, in virtual pixels: asked each time it is made again. */
    readonly width: () => number
}

/** The frames of the entries that can be picked: none, a light veil when the pointer is over. */
function pickLooks(theme: Theme): StateLooks & { readonly padding: number } {
    const veil = (alpha: number) => NineSlice.flat(theme.white, new Color(1, 1, 1, alpha))
    return {
        normal: veil(0), hovered: veil(0.12), pressed: veil(0.25), focused: veil(0.12), disabled: veil(0),
        padding: 0,
    }
}

/**
 * The entries of a source in lines that scroll: those that match what is typed, what the player found, and
 * the filters that are on. It makes no bubble: what the pointer hovers is given to its parent, which says it
 * where it wishes.
 */
export class CatalogList extends Box {


    /** What it does when an entry is clicked: with it, entries can be picked, else they are only shown. */
    public onPick: ((entry: Entry) => void)|null = null

    /** What it does with what the entries hover, each time the list is made: the parent shows it. */
    public onDetail: ((detail: Detail) => void)|null = null

    /** What it does when it has counted its entries: how many it shows, and how many the source has. */
    public onCount: ((shown: number, total: number) => void)|null = null

    constructor(
        public readonly theme: Theme,
        source: CatalogSource,
        options: CatalogListOptions,
    ){
        super("column", { align: "stretch" })
        this.#source = source
        this.#unlocked = options.unlocked ?? null
        this.#width = options.width
        this.#looks = pickLooks(theme)
    }


    /** Where it takes its entries from. Setting it shows the first of them and lists them again. */
    public get source(): CatalogSource { return this.#source }

    public set source(source: CatalogSource){
        this.#source = source
        if(this.#scroll) this.#scroll.offset = 0
        this.refresh()
    }

    /** Take another source and other filters at once, and list once. The scroll goes back to the top. */
    public use(source: CatalogSource, filters: readonly EntryFilter[]): void {
        this.#source = source
        this.#filters = filters
        if(this.#scroll) this.#scroll.offset = 0
        this.refresh()
    }

    /** What is typed to find an entry, as the player typed it. */
    public get query(): string { return this.#query }

    public set query(query: string){
        const wanted = simplified(query)
        if(wanted === this.#query) return
        this.#query = wanted
        this.refresh()
    }

    /** Does it list only what the player found? Needs a catalogue of the player. */
    public get playerOnly(): boolean { return this.#playerOnly }

    public set playerOnly(only: boolean){
        const wanted = only && this.#unlocked !== null
        if(wanted === this.#playerOnly) return
        this.#playerOnly = wanted
        this.refresh()
    }

    /** The filters that are on: an entry must pass all of them. */
    public get filters(): readonly EntryFilter[] { return this.#filters }

    public set filters(filters: readonly EntryFilter[]){
        this.#filters = filters
        this.refresh()
    }

    /** The only keys it lists, none to list them all. */
    public get keys(): ReadonlySet<string>|null { return this.#keys }

    public set keys(keys: ReadonlySet<string>|null){
        this.#keys = keys
        this.refresh()
    }

    /** What the entries shown hover, as the bubbles say it. */
    public get detail(): Detail { return this.#detail }

    /** How many entries it shows now. */
    public get shown(): number { return this.#shown }

    /** List the entries again, from the state of now. The scroll keeps how far it was scrolled. */
    public refresh(): void {
        const wrap = new WrapBox({ gap: GAP })
        this.#detail.remove()
        const category = this.#source.category
        const all = this.#source.entries()
        const kept = all.filter(entry => this.#keeps(entry, category))
        this.#shown = kept.length
        const details: Detail[] = []
        for(const entry of kept){
            const holder = this.#holderOf(entry)
            details.push(Detail.on(holder, entry.text, viewDetails(entry.view)))
            wrap.add(holder)
        }
        this.#detail = Detail.all(...details)
        const scroll = this.#scroll ??= new Scroll(this.theme, { width: this.#width(), height: 1 })
        scroll.resize(this.#width(), 1)
        scroll.content = wrap
        if(scroll.parent !== this) this.add(scroll, { grow: 1 })
        this.onCount?.(kept.length, all.length)
        this.onDetail?.(this.#detail)
    }


    #source: CatalogSource
    readonly #unlocked: PlayerCatalog|null
    readonly #width: () => number
    readonly #looks: StateLooks & { readonly padding: number }
    #scroll: Scroll|null = null
    #detail = Detail.none()
    #query = ""
    #playerOnly = false
    #filters: readonly EntryFilter[] = []
    #keys: ReadonlySet<string>|null = null
    #shown = 0

    /** Does an entry stay in the list? */
    #keeps(entry: Entry, category: CatalogCategory|null): boolean {
        if(this.#keys && !this.#keys.has(entry.key)) return false
        const unlocked = this.#unlocked
        if(this.#playerOnly && unlocked && category && !unlocked.has(category, entry.key)) return false
        if(this.#query !== "" && !simplified(plainText(entry.search ?? entry.text)).includes(this.#query)) return false
        return this.#filters.every(filter => filter.test(entry))
    }

    /** What holds an entry in the list: a button when it can be picked, else a plain holder. */
    #holderOf(entry: Entry): Panel|Button {
        const onPick = this.onPick
        if(!onPick){
            const holder = new Panel(this.theme, { background: null, padding: 0, interactive: false })
            holder.content = entry.view
            return holder
        }
        const button = new Button(this.theme, entry.view, { looks: this.#looks })
        button.onActivate = () => onPick(entry)
        // A card takes the press for itself: a press on one of the cards of the entry picks the entry too.
        for(const view of cardViewsUnder(entry.view)) view.onPick = () => onPick(entry)
        return button
    }
}
