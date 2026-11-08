import { Box, Rect } from "../../../../engine/ui"
import type { Theme } from "../../../../engine/ui"
import type { Visual } from "../../sim/base/Visual"

import type { UnitSprites } from "../look/UnitSprites"
import { AbsItemIcon, STATUS_ICON_SIZE } from "./AbsItemIcon"

/** What an item of the list shows: abstract, a look and a text, not what they stand for. */
export interface AbsItem {
    readonly visual: Visual

    /** Written over the bottom right corner of its icon. */
    readonly text: string

    /** Written in yellow over its top right corner: an empty text only outlines it, none for not used. */
    readonly activation?: string|null

    /** What the pointer coming over it or leaving it does, nothing when none. */
    readonly onHover?: (over: boolean) => void

    /** The size of its picture at scale 1, the one of the list when none. */
    readonly iconSize?: number
}

/** Where the icons lie: at the start, the middle or the end. */
export type AbsItemPlace = "start"|"center"|"end"

/** How a list is set up. */
export interface AbsItemListOptions {
    /** In a row or in a column, a row by default. */
    readonly direction?: "row"|"column"

    /** Where the icons lie across the list, at the start by default. */
    readonly align?: AbsItemPlace

    /** Where the icons lie along the list when it is longer than they are, at the start by default. */
    readonly justify?: AbsItemPlace

    /** How many times larger than their base size the icons are, 1 by default. */
    readonly scale?: number

    /** The size of the picture of an icon at scale 1 when its item gives none. */
    readonly iconSize?: number
}

/**
 * Icons in a row or a column, one for each item it is given. It knows only what an item shows.
 */
export class AbsItemList extends Box {


    constructor(
        public readonly theme: Theme,
        public readonly sprites: UnitSprites,
        options: AbsItemListOptions = {},
    ){
        const scale = options.scale ?? 1
        super(options.direction ?? "row", { gap: scale, align: options.align ?? "start" })
        this.#scale = scale
        this.#iconSize = options.iconSize ?? STATUS_ICON_SIZE
        this.#justify = options.justify ?? "start"
    }


    /** How many items it shows. */
    public get count(): number { return this.#icons.length }

    /** Show these items instead of the former ones. */
    public set(items: readonly AbsItem[]): void {
        for(const icon of this.#icons) this.remove(icon)
        this.#icons.length = 0
        for(const item of items) this.append(item)
    }

    /** Show an item after the others. */
    public append(item: AbsItem): void {
        const icon = new AbsItemIcon(this.theme, this.sprites, item.visual, item.text, this.#scale)
        this.#fill(icon, item)
        this.#icons.push(icon)
        this.add(icon)
    }

    /**
     * Stop showing the item at a place.
     *
     * @throws {@link Error} When there is none.
     */
    public removeAt(index: number): void {
        const icon = this.#iconAt(index)
        this.#icons.splice(index, 1)
        this.remove(icon)
    }

    /**
     * Show another item in the place of the one at an index, its icon changed where it stands.
     *
     * @throws {@link Error} When there is no item at that index.
     */
    public updateAt(index: number, item: AbsItem): void {
        const icon = this.#iconAt(index)
        icon.visual = item.visual
        icon.text = item.text
        this.#fill(icon, item)
    }


    /** Lay the icons out, then move them along the list to where it is asked they lie. */
    protected override arranged(): void {
        super.arranged()
        const justify = this.#justify
        const icons = this.#icons
        if(justify === "start" || icons.length === 0) return
        const column = this.direction === "column"
        const last = icons[icons.length - 1].bounds
        const room = (column ? this.bounds.height - last.y - last.height : this.bounds.width - last.x - last.width)
            - this.padding
        const shift = justify === "center" ? Math.floor(room / 2) : room
        if(shift <= 0) return
        for(const icon of icons){
            const { x, y, width, height } = icon.bounds
            this.place(icon, this.#rect.set(column ? x : x + shift, column ? y + shift : y, width, height))
        }
    }


    /** Give an icon what an item says besides its look and its text. */
    #fill(icon: AbsItemIcon, item: AbsItem): void {
        icon.iconSize = item.iconSize ?? this.#iconSize
        icon.activation = item.activation ?? null
        icon.onHover = item.onHover ?? null
    }

    #iconAt(index: number): AbsItemIcon {
        const icon = this.#icons[index]
        if(!icon) throw new Error(`The item ${index} of a list of ${this.#icons.length} was asked for.`)
        return icon
    }


    readonly #icons: AbsItemIcon[] = []
    readonly #scale: number
    readonly #iconSize: number
    readonly #justify: AbsItemPlace
    readonly #rect = new Rect()
}
