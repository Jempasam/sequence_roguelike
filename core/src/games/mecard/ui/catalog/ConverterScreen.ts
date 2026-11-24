import type { InputFrame } from "../../../../engine/input"
import { Color } from "../../../../engine/math"
import { Box, Button, Dropdown, Label, NineSlice, Panel, Paragraph, Scroll, Tabs } from "../../../../engine/ui"
import type { Component, Layer, Theme, UiRoot } from "../../../../engine/ui"

import type { PlayerCatalog } from "../../persist/PlayerCatalog"
import { convert, explain, KINDS, NoResultError, profileRows, TARGETS } from "../../sim/analysis"
import type { Kind, Target } from "../../sim/analysis"
import type { CatalogCategory } from "../../sim/save/catalogSave"
import { Detail } from "../hud/Detail"
import { DetailTooltip } from "../hud/DetailTooltip"
import { viewDetails } from "../hud/viewDetails"
import { cardsPerRow, sections } from "../library/entries"
import type { Entry, LibraryLook, Section } from "../library/entries"
import { CHOSEN_TEXT, DIM_TEXT, WARNING_TEXT } from "../look/theme"
import type { UnitSprites } from "../look/UnitSprites"
import { FRAME_THICKNESS } from "../look/wood"

import { analysisView } from "./AnalysisView"
import { CatalogBrowser } from "./CatalogBrowser"
import { ConvertedCatalog } from "./ConvertedCatalog"
import { entryOf, nameOfMade } from "./entryOf"
import { kindOfEntry } from "./kindOf"
import { profileText } from "./profileText"

/** The color behind the bench. */
const BACKDROP = new Color(0.1, 0.06, 0.03)

/** The space around and between things, in virtual pixels. */
const MARGIN = 4

/** The types of the catalogue that a conversion starts from. */
const SOURCES: ReadonlySet<CatalogCategory> = new Set(["monsters", "pets", "kits", "boosters", "cards"])

/** What the bench of conversions hears from the game. */
export interface ConverterHost {
    /** Leave the bench, back to where it was opened from. */
    leave(): void
}

/**
 * The bench of conversions: three tabs. The first chooses a thing in the catalogue and shows what it becomes
 * as a thing of the kind chosen, with how each of its cards was read. The second tells what the analysis
 * read in it and how: its cards, the rounds it plays, how each chain was found. The third lists every thing
 * of a kind as it becomes a thing of another.
 */
export class ConverterScreen {


    constructor(
        public readonly theme: Theme,

        /** The interface the bench lays its panels in. */
        public readonly ui: UiRoot,

        public readonly host: ConverterHost,

        /** The pictures of the units, which the entries of characters and monsters show. */
        sprites: UnitSprites,

        /** What the player found, none for a bench that cannot tell. */
        catalog: PlayerCatalog|null = null,
    ){
        this.#sprites = sprites
        this.#layer = ui.addLayer("converter")
        this.#layer.content.visible = false
        this.#tipLayer = ui.addLayer("converter-tooltip")
        this.#tipLayer.content.visible = false
        this.#popups = ui.addLayer("converter-popup")
        this.#tooltip = new DetailTooltip(ui, this.#tipLayer, theme, {
            color: DIM_TEXT, paper: () => sprites.paper,
        })
        const perRow = () => cardsPerRow(ui.width - 2 * MARGIN)
        this.#look = { theme, sprites, perRow }
        const width = () => ui.width - 2 * MARGIN
        this.#browser = new CatalogBrowser(theme, {
            sections: sections(this.#look), width, allowed: SOURCES, unlocked: catalog,
            unlockedToggle: catalog !== null,
        })
        this.#browser.onPick = (section, entry) => this.#choose(section, entry)
        this.#browser.onDetail = detail => this.#hear(detail)
        this.#converted = new ConvertedCatalog(theme, this.#popups, this.#look, { width, unlocked: catalog })
        this.#converted.onDetail = detail => this.#hear(detail)
        this.#target = KINDS[KINDS.length - 1]
        this.#targetChoice = new Dropdown(
            theme, this.#popups, TARGETS.map(each => ({ id: each.id, label: each.label })), this.#target.id,
        )
        this.#targetChoice.onSelect = id => {
            this.#target = TARGETS.find(target => target.id === id) ?? this.#target
            this.#showResult()
            this.#tabs?.refresh()
        }
    }


    /** Is the bench shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    public set visible(visible: boolean){
        if(visible === this.visible) return
        this.#layer.content.visible = visible
        this.#tipLayer.content.visible = visible
        if(!visible) this.#targetChoice.close()
        if(visible) this.#size = ""
    }

    /** The bubbles that say what is hovered. */
    public get tooltip(): DetailTooltip { return this.#tooltip }

    /** What the chosen thing is made into. */
    public get target(): Target<unknown> { return this.#target }

    /** The text of the lines that tell how the cards of the chosen thing were read, none before a choice. */
    public get profiles(): readonly string[] { return this.#profiles }

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
    readonly #tipLayer: Layer
    readonly #popups: Layer
    readonly #tooltip: DetailTooltip
    readonly #sprites: UnitSprites
    readonly #look: LibraryLook
    readonly #browser: CatalogBrowser
    readonly #converted: ConvertedCatalog
    readonly #targetChoice: Dropdown
    #target: Target<unknown>
    #picked: { readonly kind: Kind<unknown>, readonly from: unknown }|null = null
    #resultSlot = new Box("column", { gap: MARGIN, align: "stretch" })
    #resultDetail: Detail|null = null
    #analysisDetail: Detail|null = null
    #profiles: string[] = []
    #tabs: Tabs|null = null
    #size = ""

    /** What the entries hover now: the bubbles tell it. */
    #hear(detail: Detail): void {
        this.#tooltip.reset()
        this.#tooltip.attach(detail)
    }

    /** Take the thing of an entry as what is converted. */
    #choose(section: Section, entry: Entry): void {
        const kind = kindOfEntry(section.category, entry)
        this.#picked = kind ? { kind, from: kind.all().find(each => kind.nameOf(each) === entry.key) } : null
        this.#showResult()
    }

    /** Show what the thing chosen becomes, and how its cards were read. */
    #showResult(): void {
        const slot = this.#resultSlot
        for(const child of [...slot.children]) slot.remove(child)
        this.#resultDetail?.remove()
        this.#resultDetail = null
        this.#profiles = []
        this.#targetChoice.parent?.remove(this.#targetChoice)
        slot.add(this.#targetChoice)
        const picked = this.#picked
        if(!picked || picked.from === undefined){
            slot.add(new Label(this.theme, "Choisir une carte, un monstre, un familier, un aventurier ou un booster.", {
                color: DIM_TEXT,
            }))
            return
        }
        const name = picked.kind.nameOf(picked.from)
        try {
            const made = convert(picked.kind, picked.from, this.#target)
            slot.add(new Label(this.theme, `${name} → ${nameOfMade(this.#target, made)}`, { color: CHOSEN_TEXT }))
            const view = entryOf(this.#look, this.#target, made).view
            slot.add(view)
            this.#resultDetail = Detail.all(...viewDetails(view))
            this.#tooltip.attach(this.#resultDetail)
            this.#profiles = profileRows(picked.kind, picked.from).map(profileText)
            for(const line of this.#profiles) slot.add(new Label(this.theme, line, { color: DIM_TEXT }))
        }
        catch(error){
            if(error instanceof NoResultError){
                slot.add(new Paragraph(this.theme, `${name} : ${error.why}.`, { color: DIM_TEXT }))
                this.#profiles = profileRows(picked.kind, picked.from).map(profileText)
                return
            }
            slot.add(new Label(this.theme, `Conversion impossible : ${String(error)}`, { color: WARNING_TEXT }))
        }
    }

    /** The page that chooses a thing and shows what it becomes. */
    #convertPage(): Component {
        this.#browser.parent?.remove(this.#browser)
        this.#resultSlot.parent?.remove(this.#resultSlot)
        const row = new Box("row", { gap: MARGIN, align: "stretch" })
        row.add(this.#browser, { grow: 2 })
        const side = new Scroll(this.theme, { width: Math.floor(this.ui.width / 3), height: 1 })
        side.content = this.#resultSlot
        row.add(side, { grow: 1 })
        this.#showResult()
        return row
    }

    /**
     * The page that tells what the analysis read in the thing chosen and how, for the kind chosen: the
     * steps of the algorithm, each card, the rounds, and how each chain was found.
     */
    #analysisPage(): Component {
        this.#targetChoice.parent?.remove(this.#targetChoice)
        this.#analysisDetail?.remove()
        this.#analysisDetail = null
        const column = new Box("column", { gap: MARGIN, align: "stretch" })
        column.add(this.#targetChoice)
        const picked = this.#picked
        if(!picked || picked.from === undefined){
            column.add(new Label(this.theme, "Choisir une source dans l'onglet Convertir.", { color: DIM_TEXT }))
        }
        else {
            try {
                const shown = analysisView(this.theme, explain(picked.kind, picked.from, this.#target))
                column.add(shown.view)
                this.#analysisDetail = shown.detail
                this.#tooltip.attach(shown.detail)
            }
            catch(error){
                column.add(new Label(this.theme, `Analyse impossible : ${String(error)}`, { color: WARNING_TEXT }))
            }
        }
        const scroll = new Scroll(this.theme, { width: this.ui.width - 2 * MARGIN, height: 1 })
        scroll.content = column
        return scroll
    }

    /** The page that lists every thing of a kind as it becomes a thing of another. */
    #listPage(): Component {
        this.#converted.parent?.remove(this.#converted)
        return this.#converted
    }

    /** Build the panels again: the backdrop, the title, and the two pages. */
    #build(): void {
        const content = this.#layer.content
        for(const child of [...content.children]) content.remove(child)
        const backdrop = new Panel(this.theme, {
            background: NineSlice.flat(this.theme.white, BACKDROP), padding: 0, interactive: false,
        })
        content.add(backdrop, { x: "stretch", y: "stretch" })
        const column = new Box("column", { gap: MARGIN, padding: MARGIN, align: "stretch" })
        const title = new Label(this.theme, "Conversions", { color: CHOSEN_TEXT })
        const leave = new Button(this.theme, "Retour")
        leave.onActivate = () => this.host.leave()
        const head = new Box("row", { gap: MARGIN, align: "center" })
        head.add(title)
        head.add(new Box("row"), { grow: 1 })
        head.add(leave)
        const wood = this.#sprites.wood
        const pad = wood ? FRAME_THICKNESS + 1 : this.theme.panel.padding
        const header = new Panel(this.theme, wood ? { background: wood.frame, padding: pad } : {})
        header.content = head
        column.add(header)
        this.#browser.refresh()
        this.#converted.refresh()
        const selected = this.#tabs?.selected ?? 0
        this.#tabs = new Tabs(this.theme, [
            { title: "Convertir", build: () => this.#convertPage() },
            { title: "Analyse", build: () => this.#analysisPage() },
            { title: "Catalogue converti", build: () => this.#listPage() },
        ], { selected })
        column.add(this.#tabs, { grow: 1 })
        content.add(column, { x: "stretch", y: "stretch" })
    }
}
