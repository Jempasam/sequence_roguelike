import { Box, Dropdown, Label } from "../../../../engine/ui"
import type { Layer, Theme } from "../../../../engine/ui"
import { concat } from "../../../../semantic"

import type { PlayerCatalog } from "../../persist/PlayerCatalog"
import { convert, KINDS, NoResultError, TARGETS } from "../../sim/analysis"
import type { Kind, Target } from "../../sim/analysis"
import type { Detail } from "../hud/Detail"
import type { Entry, LibraryLook } from "../library/entries"
import { DIM_TEXT } from "../look/theme"

import { CatalogList } from "./CatalogList"
import type { CatalogSource } from "./CatalogList"
import { entryOf } from "./entryOf"
import { FilterBar } from "./FilterBar"
import { categoryOfKind } from "./kindOf"

/** The space between the parts, in virtual pixels. */
const GAP = 4

/** What a source of the game became: the source, and what was made of it. */
interface Converted {
    readonly from: unknown
    readonly made: unknown
}

/** How a catalogue of converted things is set up. */
export interface ConvertedCatalogOptions {
    /** How wide it is, in virtual pixels: asked each time it is made again. */
    readonly width: () => number

    /** What the player found, none for a catalogue that cannot tell: then the sources are not told apart. */
    readonly unlocked?: PlayerCatalog|null
}

/**
 * A catalogue of what the things of a kind become as things of another: choose the kind to start from and the
 * kind to end in, and each thing of the game of the first is listed as it comes out of the conversion. The
 * bubble of an entry tells the thing it comes from and what it became.
 */
export class ConvertedCatalog extends Box {


    /** What it does with what the entries hover, each time the list is made again. */
    public onDetail: ((detail: Detail) => void)|null = null

    /**
     * @param layer - The layer the menus of the choices open in, the popup layer in practice.
     * @param look - What the entries need to be built.
     */
    constructor(
        public readonly theme: Theme,
        layer: Layer,
        private readonly look: LibraryLook,
        options: ConvertedCatalogOptions,
    ){
        super("column", { gap: GAP, align: "stretch" })
        this.#source = KINDS[0]
        this.#target = KINDS[KINDS.length - 1]
        this.sourceChoice = new Dropdown(
            theme, layer, KINDS.map(kind => ({ id: kind.id, label: kind.label })), this.#source.id,
        )
        this.targetChoice = new Dropdown(
            theme, layer, TARGETS.map(target => ({ id: target.id, label: target.label })), this.#target.id,
        )
        this.filterBar = new FilterBar(theme, (options.unlocked ?? null) !== null)
        this.count = new Label(theme, "", { color: DIM_TEXT })
        this.list = new CatalogList(theme, this.#listed(), {
            unlocked: options.unlocked ?? null, width: options.width,
        })
        this.list.onCount = (shown, total) => {
            this.count.text = this.list.playerOnly ? `${shown}/${total}` : `${shown}`
        }
        this.list.onDetail = detail => this.onDetail?.(detail)
        this.sourceChoice.onSelect = id => {
            this.#source = kindOf(id)
            this.#show()
        }
        this.targetChoice.onSelect = id => {
            this.#target = targetOf(id)
            this.#show()
        }
        this.filterBar.onChange = () => {
            this.list.playerOnly = this.filterBar.unlocked
        }
        const top = new Box("row", { gap: GAP, align: "center" })
        top.add(this.sourceChoice)
        top.add(new Label(theme, "→"))
        top.add(this.targetChoice)
        top.add(this.count)
        top.add(this.filterBar)
        this.add(top)
        this.add(this.list, { grow: 1 })
    }


    public readonly sourceChoice: Dropdown
    public readonly targetChoice: Dropdown
    public readonly filterBar: FilterBar

    /** How many entries are listed. */
    public readonly count: Label
    public readonly list: CatalogList

    /** The kind the things come from. */
    public get source(): Kind<unknown> { return this.#source }

    /** What the things become. */
    public get target(): Target<unknown> { return this.#target }

    /**
     * Start from another kind.
     * @throws {@link Error} When no kind has the id.
     */
    public set source(id: string){
        this.sourceChoice.selected = id
        this.#source = kindOf(id)
        this.#show()
    }

    /**
     * End in another kind, or in what is only built.
     * @throws {@link Error} When no target has the id.
     */
    public set target(id: string){
        this.targetChoice.selected = id
        this.#target = targetOf(id)
        this.#show()
    }

    /** List the things again, from the state of now. */
    public refresh(): void {
        this.list.refresh()
    }


    #source: Kind<unknown>
    #target: Target<unknown>

    /** What each pair of kinds made, kept: a conversion plays cards, and is the same each time. */
    readonly #made = new Map<string, readonly Converted[]>()

    /** The source of the list for the kinds chosen: the entries are made as the list asks. */
    #listed(): CatalogSource {
        const source = this.#source
        const target = this.#target
        return { category: categoryOfKind(source), entries: () => this.#entries(source, target) }
    }

    /** List the things of the kinds chosen. */
    #show(): void {
        this.list.use(this.#listed(), [])
    }

    /** What the things of a kind become as things of another, as entries. One that fails is left out. */
    #entries(source: Kind<unknown>, target: Target<unknown>): Entry[] {
        const key = `${source.id}>${target.id}`
        let converted = this.#made.get(key)
        if(!converted){
            const found: Converted[] = []
            for(const from of source.all()){
                try {
                    found.push({ from, made: convert(source, from, target) })
                }
                catch(error){
                    if(error instanceof NoResultError) continue
                    throw error
                }
            }
            converted = found
            this.#made.set(key, found)
        }
        return converted.map(({ from, made }) => {
            const shown = entryOf(this.look, target, made)
            const name = source.nameOf(from)
            return {
                view: shown.view,
                text: concat(name, " → ", shown.text),
                search: concat(name, " ", shown.search ?? shown.text),
                key: name,
                value: made,
            }
        })
    }
}

/** The kind that has an id. */
function kindOf(id: string): Kind<unknown> {
    const kind = KINDS.find(each => each.id === id)
    if(!kind) throw new Error(`No kind has the id ${id}.`)
    return kind
}

/** The target that has an id: a kind, or what is only built. */
function targetOf(id: string): Target<unknown> {
    const target = TARGETS.find(each => each.id === id)
    if(!target) throw new Error(`No target has the id ${id}.`)
    return target
}
