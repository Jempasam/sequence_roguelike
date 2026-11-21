import { Box, Button, Label, Panel } from "../../../../engine/ui"
import type { Layer, Theme, UiRoot } from "../../../../engine/ui"
import { beigeButton, brownButton, DIM_TEXT } from "../look/theme"
import type { UnitSprites } from "../look/UnitSprites"
import { FRAME_THICKNESS } from "../look/wood"

/** The room between two lines, and between two columns, in virtual pixels. */
const GAP = 2
const COLUMN_GAP = 4

/** One cell of a panel: a text, which a click may choose. */
export interface Cell {
    readonly text: string

    /** Is it written dim, for what is over? */
    readonly dim?: boolean

    /** What a click on it chooses, none for a text that cannot be clicked. */
    readonly key?: string
}

/** The cells of a panel and how they lie: a column after another, each filled from the top. */
export interface Cells {
    readonly cells: readonly Cell[]

    /** How many columns they are laid in. */
    readonly columns: number

    /** What is said above the cells, such as the question, nothing when absent. */
    readonly title?: string

    /**
     * Does a click only select a cell, a "Valider" button under them making the choice? A click chooses
     * right away when not.
     */
    readonly confirm?: boolean
}

/** Where a panel lies on the screen, and which layer it lies in. */
export interface PanelPlace {
    readonly layer: string
    readonly x: "start"|"center"|"end"
    readonly y: "start"|"center"|"end"
    readonly offsetX?: number
    readonly offsetY?: number
}

/**
 * A small panel in a wooden frame over the game, made of a title, then cells of text where a button chooses
 * one: what the screens of the modes that have the players choose, or just read, are made of (a bracket, a
 * draft's pool, what a saboteur sends). It holds no rule: it shows the cells it is given and says which was
 * chosen, once the player validated it when the cells ask for it.
 */
export class ClickPanel {


    /** The texts it shows, for the tests. */
    public get texts(): readonly string[] {
        const { title, cells } = this.#content
        return title === undefined ? cells.map(cell => cell.text) : [title, ...cells.map(cell => cell.text)]
    }

    /** Is it shown? */
    public get visible(): boolean { return this.#layer.content.visible }

    /** Hide it, or show it when it has something to show. */
    public set visible(visible: boolean){
        this.#wanted = visible
        this.#layer.content.visible = visible && this.#hasContent()
    }

    constructor(
        private readonly theme: Theme,
        ui: UiRoot,
        place: PanelPlace,

        /** The sprites, which hold the wood of the frame once loaded. */
        sprites?: UnitSprites,
    ){
        this.#panel = new Panel(theme)
        this.#layer = ui.addLayer(place.layer)
        this.#layer.content.visible = false
        this.#layer.content.add(this.#panel, {
            x: place.x,
            y: place.y,
            offsetX: place.offsetX ?? 0,
            offsetY: place.offsetY ?? 0,
        })
        sprites?.whenLoaded(() => {
            const wood = sprites.wood
            if(!wood) return
            this.#panel.background = wood.frame
            this.#panel.padding = FRAME_THICKNESS + 1
        })
    }


    /**
     * Show these cells, in place of the ones shown.
     *
     * @param choose - Told which cell was chosen, by its key.
     */
    public show(content: Cells, choose: (key: string) => void): void {
        this.#content = content
        this.#choose = choose
        if(this.#selected !== null && !content.cells.some(cell => cell.key === this.#selected)) this.#selected = null
        this.#build()
        this.#layer.content.visible = this.#wanted && this.#hasContent()
    }

    /** Take what it shows off the screen. */
    public hide(): void {
        this.#content = { cells: [], columns: 1 }
        this.#choose = null
        this.#selected = null
        this.#panel.content = null
        this.#layer.content.visible = false
    }


    readonly #layer: Layer
    readonly #panel: Panel
    #content: Cells = { cells: [], columns: 1 }
    #choose: ((key: string) => void)|null = null
    #selected: string|null = null
    #wanted = true

    #hasContent(): boolean {
        return this.#content.cells.length > 0 || this.#content.title !== undefined
    }

    /** Make the widgets of the cells again: the selection changes which button is lit. */
    #build(): void {
        const { theme } = this
        const { title, cells, columns, confirm } = this.#content
        const root = new Box("column", { gap: GAP * 2, align: "stretch" })
        if(title !== undefined) root.add(new Label(theme, title, { align: "center" }))
        const rows = Math.max(1, Math.ceil(cells.length / Math.max(1, columns)))
        const row = new Box("row", { gap: COLUMN_GAP, align: "stretch" })
        for(let start = 0; start < cells.length; start += rows){
            const column = new Box("column", { gap: GAP, align: "stretch" })
            for(const cell of cells.slice(start, start + rows)) column.add(this.#widgetOf(cell, confirm === true))
            row.add(column)
        }
        if(cells.length > 0) root.add(row)
        if(confirm === true && cells.some(cell => cell.key !== undefined)){
            const validate = new Button(theme, "Valider", { ...brownButton(theme), enabled: this.#selected !== null })
            validate.onActivate = () => {
                if(this.#selected !== null) this.#choose?.(this.#selected)
            }
            root.add(validate)
        }
        this.#panel.content = root
    }

    #widgetOf(cell: Cell, confirm: boolean): Label|Button {
        const { theme } = this
        const key = cell.key
        if(key === undefined) return new Label(theme, cell.text, cell.dim ? { color: DIM_TEXT } : {})
        const chosen = confirm && key === this.#selected
        const button = new Button(theme, cell.text, chosen ? beigeButton(theme) : brownButton(theme))
        button.onActivate = () => {
            if(!confirm){
                this.#choose?.(key)
                return
            }
            this.#selected = key
            this.#build()
        }
        return button
    }
}
