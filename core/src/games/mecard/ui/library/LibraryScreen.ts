import type { InputFrame } from "../../../../engine/input"
import { Color } from "../../../../engine/math"
import { Box, Button, Label, NineSlice, Panel } from "../../../../engine/ui"
import type { Layer, Theme, UiRoot } from "../../../../engine/ui"

import type { PlayerCatalog } from "../../persist/PlayerCatalog"
import { CatalogBrowser } from "../catalog/CatalogBrowser"
import { DetailTooltip } from "../hud/DetailTooltip"
import { CHOSEN_TEXT, DIM_TEXT } from "../look/theme"
import { FRAME_THICKNESS } from "../look/wood"
import type { UnitSprites } from "../look/UnitSprites"
import { cardsPerRow, sections } from "./entries"

/** The color behind the catalogue. */
const BACKDROP = new Color(0.1, 0.06, 0.03)

/** The space around and between things, in virtual pixels. */
const MARGIN = 4

/** What the catalogue hears from the game. */
export interface LibraryHost {
    /** Leave the catalogue, back to the journey. */
    leave(): void
}

/**
 * The catalogue: a title, and a browser of the entries by tab that scrolls. A bubble says what the pointer
 * hovers.
 */
export class LibraryScreen {


    constructor(
        public readonly theme: Theme,

        /** The interface the catalogue lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: LibraryHost,

        /** The pictures of the units, which the entries of characters and monsters show. */
        sprites: UnitSprites,

        /** What the player found, none for a catalogue that cannot tell. */
        public readonly catalog: PlayerCatalog|null = null,
    ){
        this.#sprites = sprites
        this.#layer = ui.addLayer("library")
        this.#layer.content.visible = false
        this.#tipLayer = ui.addLayer("library-tooltip")
        this.#tipLayer.content.visible = false
        this.#tooltip = new DetailTooltip(ui, this.#tipLayer, theme, {
            color: DIM_TEXT, paper: () => sprites.paper,
        })
        const perRow = () => cardsPerRow(ui.width - 2 * MARGIN)
        this.#browser = new CatalogBrowser(theme, {
            sections: sections({ theme, sprites, perRow }),
            width: () => ui.width - 2 * MARGIN,
            unlocked: catalog,
        })
        this.#browser.onDetail = detail => {
            this.#tooltip.reset()
            this.#tooltip.attach(detail)
        }
        catalog?.changed.add(() => { if(this.visible && this.playerOnly) this.#browser.list.refresh() })
    }


    /** Does the catalogue list only what the player found? */
    public get playerOnly(): boolean { return this.#browser.playerOnly }

    public set playerOnly(only: boolean){
        const wanted = only && this.catalog !== null
        if(wanted === this.#browser.playerOnly) return
        this.#browser.playerOnly = wanted
    }


    /** Is the catalogue shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        if(visible === this.visible) return
        this.#layer.content.visible = visible
        this.#tipLayer.content.visible = visible
        if(visible) this.#size = ""
    }

    /** The index of the tab shown. */
    public get selected(): number { return this.#browser.selected }

    public set selected(index: number){
        this.#browser.selected = index
    }

    /** The titles of the tabs. */
    public get titles(): string[] { return this.#browser.sections.map(section => section.title) }

    /** The bubbles that say what is hovered. */
    public get tooltip(): DetailTooltip { return this.#tooltip }

    /** Lay the panels out again when the interface changed size, and let the bubbles read the input. */
    public frame(input: InputFrame): void {
        const size = `${this.ui.width}×${this.ui.height}`
        if(size !== this.#size){
            this.#size = size
            this.#build()
        }
        this.#tooltip.frame(input)
    }


    readonly #layer: Layer

    /** The layer over the catalogue that the bubbles open in. */
    readonly #tipLayer: Layer

    /** The bubbles that say what is hovered. */
    readonly #tooltip: DetailTooltip
    readonly #browser: CatalogBrowser
    readonly #sprites: UnitSprites
    #size = ""

    /** Build the panels again: the backdrop, then the title, and the browser. */
    #build(): void {
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        this.#browser.parent?.remove(this.#browser)
        const backdrop = new Panel(this.theme, {
            background: NineSlice.flat(this.theme.white, BACKDROP), padding: 0, interactive: false,
        })
        content.add(backdrop, { x: "stretch", y: "stretch" })
        const column = new Box("column", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        const title = new Label(this.theme, "Catalogue", { color: CHOSEN_TEXT })
        const leave = new Button(this.theme, "Retour")
        leave.onActivate = () => this.host.leave()
        const head = new Box("row", { gap: MARGIN, align: "center" })
        head.add(title)
        head.add(new Box("row"), { grow: 1 })
        head.add(leave)
        // The header sits in the wood of the frames of the journey and the battle.
        const wood = this.#sprites.wood
        const pad = wood ? FRAME_THICKNESS + 1 : this.theme.panel.padding
        const header = new Panel(this.theme, wood ? { background: wood.frame, padding: pad } : {})
        header.content = head
        column.add(header)
        this.#browser.refresh()
        column.add(this.#browser, { grow: 1 })
        content.add(column, { x: "stretch", y: "stretch" })
    }
}
