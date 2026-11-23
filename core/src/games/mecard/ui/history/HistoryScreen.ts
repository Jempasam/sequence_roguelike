import type { InputFrame } from "../../../../engine/input"
import { Color } from "../../../../engine/math"
import { Box, Button, Label, NineSlice, Panel, Scroll, WrapBox } from "../../../../engine/ui"
import type { Layer, Theme, UiRoot } from "../../../../engine/ui"
import { loadedHeroes } from "../../sim/save/runSave"
import type { HistoryEntry } from "../../sim/save/historySave"

import { Detail } from "../hud/Detail"
import { DetailTooltip } from "../hud/DetailTooltip"
import { viewDetails } from "../hud/viewDetails"
import { unitView } from "../hud/unitView"
import { CHOSEN_TEXT, DIM_TEXT } from "../look/theme"
import type { UnitSprites } from "../look/UnitSprites"

/** The color behind the history. */
const BACKDROP = new Color(0.1, 0.06, 0.03)

/** The space around and between things, in virtual pixels. */
const MARGIN = 4

/** How wide a card of a character is, and the space between two, to know how many fit in a row. */
const CARD_WIDTH = 44
const CARD_GAP = 2
const ENTRY_FRAME = 16

/** What the history asks of its game. */
export interface HistoryHost {
    /** Leave the history, back to the main menu. */
    leave(): void
}

/** The line that heads a game of the history: when it ended, how far it went, and its gold. */
export function entryTitle(entry: HistoryEntry): string {
    const when = new Date(entry.date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
    return `${when} · Étage ${entry.depth} (${entry.floor}) · ${entry.gold} or`
}

/**
 * The history: the games that ended, the last first, each with its party as it stood: every character with
 * its hearts, its cards, its items and its usables. A bubble says what a hovered card is.
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
        this.#size = ""
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
    ){
        this.#layer = ui.addLayer("history")
        this.#layer.content.visible = false
        this.#tipLayer = ui.addLayer("history-tooltip")
        this.#tipLayer.content.visible = false
        this.#tooltip = new DetailTooltip(ui, this.#tipLayer, theme, {
            color: DIM_TEXT, paper: () => sprites.paper,
        })
        this.#back = new Button(theme, "Retour")
        this.#back.onActivate = () => host.leave()
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
        const list = new Box("column", { gap: MARGIN * 2, align: "stretch", padding: MARGIN })
        if(this.#entries.length === 0){
            list.add(new Label(theme, "Aucune partie terminée pour l'instant.", { color: DIM_TEXT, align: "center" }))
        }
        for(const entry of this.#entries) list.add(this.#entryView(entry))
        const scroll = new Scroll(theme, { width: ui.width, height: 1, wheel: true })
        scroll.content = list
        column.add(scroll, { grow: 1 })
        column.add(this.#back, { align: "center" })
        content.add(column, { x: "stretch", y: "stretch" })
        // DETAILS //
        const hovers = Detail.all(...viewDetails(list))
        this.#tooltip.attach(hovers)
        this.#hovers = hovers
    }


    readonly #layer: Layer

    /** The layer over the history that the bubbles open in. */
    readonly #tipLayer: Layer

    /** The bubbles that say what is hovered. */
    readonly #tooltip: DetailTooltip
    readonly #back: Button
    #entries: readonly HistoryEntry[] = []
    #size = ""

    /** What the cards and hearts of the games tell, until the history is built again. */
    #hovers: Detail|null = null

    /** How many cards fit in a row of a character at the width of the interface now. */
    #perRow(): number {
        return Math.max(1, Math.floor((this.ui.width - 2 * MARGIN - ENTRY_FRAME + CARD_GAP) / (CARD_WIDTH + CARD_GAP)))
    }

    /** A game: its title, and its characters. */
    #entryView(entry: HistoryEntry): Box {
        const { theme } = this
        const view = new Box("column", { gap: MARGIN, align: "stretch" })
        view.add(new Label(theme, entryTitle(entry), { color: CHOSEN_TEXT }))
        const wrap = new WrapBox({ gap: MARGIN })
        for(const hero of loadedHeroes(entry.heroes)){
            wrap.add(unitView(theme, this.sprites, hero, { perRow: this.#perRow() }))
        }
        view.add(wrap)
        return view
    }
}
