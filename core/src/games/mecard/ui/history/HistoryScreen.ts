import type { InputFrame } from "../../../../engine/input"
import { Color } from "../../../../engine/math"
import { Box, Button, Label, NineSlice, Panel, Scroll } from "../../../../engine/ui"
import type { Layer, Theme, UiRoot } from "../../../../engine/ui"
import type { ClipboardPort } from "../../../../platform"
import type { HistoryEntry } from "../../sim/save/historySave"

import { Detail } from "../hud/Detail"
import { DetailTooltip } from "../hud/DetailTooltip"
import { viewDetails } from "../hud/viewDetails"
import type { FloorBorders } from "../look/borders"
import { CHOSEN_TEXT, DIM_TEXT } from "../look/theme"
import type { UnitSprites } from "../look/UnitSprites"
import { historyEntryView } from "./HistoryEntryView"
import type { EntryView } from "./HistoryEntryView"
import { medalsOf, sortedAndFiltered } from "./historyOrder"
import type { SortMode } from "./historyOrder"
import { historyToolbar, toolbarGroup } from "./HistoryToolbar"

/** The color behind the history. */
const BACKDROP = new Color(0.1, 0.06, 0.03)

/** The space around and between things, in virtual pixels. */
const MARGIN = 4

/** The words of the ways to order the games. */
const SORTS: readonly { readonly label: string, readonly value: SortMode }[] = [
    { label: "Récentes", value: "recent" },
    { label: "Plus profondes", value: "deepest" },
    { label: "Plus riches", value: "richest" },
]

/** What the history asks of its game. */
export interface HistoryHost {
    /** Leave the history, back to the main menu. */
    leave(): void
}

/** What the history shows the games with, beyond the pictures of the units. */
export interface HistoryLooks {
    /** The frames of the floors. */
    readonly borders: FloorBorders

    /** The clipboard the seeds are copied to, none when it has none. */
    readonly clipboard: ClipboardPort|null
}

/**
 * The history: the games that ended, each in a card of wood in the frame of the floor it ended on, with when
 * and how it ended, and its party as it stood. The cards fold up and open out, the games are ordered and
 * filtered by floor, and a bubble says what a hovered card is.
 */
export class HistoryScreen {


    /** Is the history shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        if(visible === this.visible) return
        this.#layer.content.visible = visible
        this.#tipLayer.content.visible = visible
        if(visible) this.#size = ""
    }

    /** The games shown, the last first. */
    public get entries(): readonly HistoryEntry[] { return this.#entries }

    public set entries(entries: readonly HistoryEntry[]){
        this.#entries = [...entries].reverse()
        this.#opened = new Set(this.#entries.slice(0, 1))
        this.#size = ""
    }

    /** How the games are ordered. */
    public get sort(): SortMode { return this.#sort }

    public set sort(sort: SortMode){
        if(sort === this.#sort) return
        this.#sort = sort
        this.#size = ""
    }

    /** The floor the games shown ended on, none for all of them. */
    public get floorFilter(): string|null { return this.#floorFilter }

    public set floorFilter(floor: string|null){
        if(floor === this.#floorFilter) return
        this.#floorFilter = floor
        this.#size = ""
    }

    /** The scroll of the list of games, the same from one drawing to the next. */
    public get listScroll(): Scroll { return this.#scroll }

    /** Is a game opened out? */
    public isOpened(entry: HistoryEntry): boolean {
        return this.#views.get(entry)?.opened ?? this.#opened.has(entry)
    }

    /** Open a game out, or fold it up, without drawing the others again. */
    public setOpened(entry: HistoryEntry, opened: boolean): void {
        const view = this.#views.get(entry)
        if(view) view.setOpened(opened)
        else if(opened) this.#opened.add(entry)
        else this.#opened.delete(entry)
    }

    /** The button back to the menu. */
    public get backButton(): Button { return this.#back }

    /** The bubbles that say what is hovered. */
    public get tooltip(): DetailTooltip { return this.#tooltip }

    constructor(
        public readonly theme: Theme,

        /** The interface the history lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: HistoryHost,

        /** The pictures of the units, which the characters show. */
        private readonly sprites: UnitSprites,

        private readonly looks: HistoryLooks,
    ){
        this.#layer = ui.addLayer("history")
        this.#layer.content.visible = false
        this.#tipLayer = ui.addLayer("history-tooltip")
        this.#tipLayer.content.visible = false
        this.#tooltip = new DetailTooltip(ui, this.#tipLayer, theme, {
            color: DIM_TEXT, paper: () => sprites.paper,
        })
        this.#scroll = new Scroll(theme, { width: ui.width, height: 1, wheel: true })
        this.#back = new Button(theme, "Retour")
        this.#back.onActivate = () => host.leave()
        looks.borders.whenLoaded(() => { this.#size = "" })
        sprites.whenLoaded(() => { this.#size = "" })
    }


    /** Lay the history out again when the interface changed size, and let the bubbles read the input. */
    public frame(input: InputFrame): void {
        const size = `${this.ui.width}×${this.ui.height}`
        if(size !== this.#size){
            this.#size = size
            this.refresh()
        }
        this.#tooltip.frame(input)
    }

    /** Build the history again. */
    public refresh(): void {
        const { theme, ui } = this
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        this.#back.parent?.remove(this.#back)
        this.#hovers?.remove()
        this.#hovers = null
        this.#tooltip.reset()
        const backdrop = new Panel(theme, {
            background: NineSlice.flat(theme.white, BACKDROP), padding: 0, interactive: false,
        })
        content.add(backdrop, { x: "stretch", y: "stretch" })
        const column = new Box("column", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        column.add(new Label(theme, "Historique", { color: CHOSEN_TEXT, align: "center" }))
        if(this.#entries.length > 0) column.add(this.#toolbar())
        // THE GAMES //
        const list = new Box("column", { gap: MARGIN * 2, align: "stretch", padding: MARGIN })
        const shown = sortedAndFiltered(this.#entries, this.#sort, this.#floorFilter)
        if(this.#entries.length === 0){
            list.add(new Label(theme, "Aucune partie terminée pour l'instant.", { color: DIM_TEXT, align: "center" }))
        } else if(shown.length === 0){
            list.add(new Label(theme, "Aucune partie ne finit sur cet étage.", { color: DIM_TEXT, align: "center" }))
        }
        const medals = medalsOf(this.#entries)
        const context = {
            theme, sprites: this.sprites, borders: this.looks.borders, clipboard: this.looks.clipboard,
        }
        this.#views.clear()
        for(const entry of shown){
            const view = historyEntryView(
                context, this.sprites.wood, entry, medals.get(entry) ?? [], this.#opened.has(entry),
                () => this.#changed(),
            )
            this.#views.set(entry, view)
            list.add(view.root)
        }
        // THE SCROLL, KEPT SO IT STAYS WHERE IT WAS //
        this.#scroll.parent?.remove(this.#scroll)
        this.#scroll.resize(ui.width, 1)
        this.#scroll.content = list
        column.add(this.#scroll, { grow: 1 })
        column.add(this.#back, { align: "center" })
        content.add(column, { x: "stretch", y: "stretch" })
        this.#attach()
    }


    readonly #layer: Layer

    /** The layer over the history that the bubbles open in. */
    readonly #tipLayer: Layer

    /** The bubbles that say what is hovered. */
    readonly #tooltip: DetailTooltip
    readonly #back: Button
    #entries: readonly HistoryEntry[] = []
    #sort: SortMode = "recent"
    #floorFilter: string|null = null

    /** The games opened out: the last one at first. */
    #opened = new Set<HistoryEntry>()
    #size = ""

    /** What the cards and hearts of the games tell, until the history is built again. */
    #hovers: Detail|null = null

    /** The games drawn now, by the game. */
    readonly #views = new Map<HistoryEntry, EntryView>()

    /** The scroll of the list, the same from one drawing to the next. */
    readonly #scroll: Scroll

    /** A game opened out or folded up: remember which are opened, and read what is hovered again. */
    #changed(): void {
        for(const [entry, view] of this.#views){
            if(view.opened) this.#opened.add(entry)
            else this.#opened.delete(entry)
        }
        this.#attach()
    }

    /** Let the bubbles tell what the cards, the hearts and the routes of the games opened out are. */
    #attach(): void {
        this.#hovers?.remove()
        const routes = [...this.#views.values()].flatMap(view => view.details)
        const { content } = this.#scroll
        const hovers = Detail.all(...content ? viewDetails(content) : [], ...routes)
        this.#tooltip.attach(hovers)
        this.#hovers = hovers
    }

    /** The buttons that order the games and keep those of a floor. */
    #toolbar(): Box {
        const { theme } = this
        const floors = [...new Set(this.#entries.map(entry => entry.floor))]
        const bar = historyToolbar([
            toolbarGroup(theme, {
                title: "Tri", options: SORTS, chosen: this.#sort, onChange: sort => { this.sort = sort },
            }),
            toolbarGroup<string|null>(theme, {
                title: "Étage",
                options: [{ label: "Tous", value: null }, ...floors.map(floor => ({ label: floor, value: floor }))],
                chosen: this.#floorFilter,
                onChange: floor => { this.floorFilter = floor },
            }),
        ])
        const box = new Box("column", { align: "stretch" })
        box.add(bar)
        return box
    }
}
