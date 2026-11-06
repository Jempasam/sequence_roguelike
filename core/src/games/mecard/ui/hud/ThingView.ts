import type { ImagePath } from "../../../../engine/assets"
import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { TextLayout } from "../../../../engine/text"
import { Box, Component, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme, UiEvent } from "../../../../engine/ui"
import type { Usable } from "../../sim/usable/Usable"

import { LIT_EDGE } from "../look/colors"
import type { UnitSprites } from "../look/UnitSprites"

/** The size of the picture of an item or a usable, in virtual pixels. */
export const ICON_SIZE = 16

/** The space between two pictures, in virtual pixels. */
const THING_GAP = 2

/** What a picture is multiplied by while its thing is spent. */
const SPENT_TINT = new Color(0.45, 0.45, 0.45)

/** The color of the uses left, and the outline around them. */
const USES_COLOR = new Color(1, 1, 1)
const USES_OUTLINE = new Color(0, 0, 0)

/**
 * The uses a usable has left, to write over its picture: `left/full` when its charges refill at each
 * battle, the charges left when it has several, none when it has one and no refill.
 */
export function usesText(usable: Usable, left = usable.charges ?? 1): string|null {
    const full = usable.charges ?? 1
    if(usable.refill === "battle") return `${left}/${full}`
    return full > 1 ? `${left}` : null
}

/**
 * An item or a usable, as its picture alone, its uses left written over its bottom right corner. It is
 * outlined while the pointer is over it, or while it is lit.
 */
export class ThingView extends Component {


    /** What the pointer coming over it or leaving does, nothing when none. */
    public onHover: ((over: boolean) => void)|null = null

    /** What a click does, nothing when none. */
    public onPick: (() => void)|null = null

    constructor(
        public readonly theme: Theme,
        public readonly sprites: UnitSprites,
        public readonly icon: ImagePath,

        /** The uses left, written over its picture, none for none. */
        public readonly uses: string|null = null,
    ){
        super()
        this.#layout = new TextLayout(theme.font, theme.textScale)
    }


    /** Is it lit, as it is when the pointer is over it? */
    public get lit(): boolean { return this.#lit }

    public set lit(lit: boolean){
        if(lit === this.#lit) return
        this.#lit = lit
        this.invalidate()
    }

    /** Is it spent, its picture dim? */
    public get spent(): boolean { return this.#spent }

    public set spent(spent: boolean){
        if(spent === this.#spent) return
        this.#spent = spent
        this.invalidate()
    }


    protected computeHint(): SizeHint {
        return sizeHint(ICON_SIZE, ICON_SIZE)
    }

    protected override get interactive(): boolean { return true }

    protected override hoverChanged(): void {
        this.invalidate()
        this.onHover?.(this.hovered)
    }

    protected override handle(event: UiEvent): void {
        if(event.type !== "pointer-down" || event.button !== 0 || !this.onPick) return
        event.consume()
        this.onPick()
    }

    protected paint(painter: Painter): void {
        painter.push()
        if(this.#lit || this.hovered){
            painter.setWhitePixel(this.theme.white)
            painter.setTint(LIT_EDGE)
            painter.rect(-1, -1, ICON_SIZE + 2, ICON_SIZE + 2)
        }
        const picture = this.sprites.thing(this.icon)
        if(picture){
            painter.setTint(this.#spent ? SPENT_TINT : new Color())
            painter.sprite(picture, 0, 0)
        }
        if(this.uses){
            const layout = this.#layout
            const left = ICON_SIZE - layout.widthOf(this.uses)
            const top = ICON_SIZE - layout.lineHeight
            layout.drawOutlined(painter, this.uses, left, top, USES_COLOR, USES_OUTLINE)
        }
        painter.pop()
    }


    readonly #layout: TextLayout
    #lit = false
    #spent = false
}

/** Pictures of things in rows as wide as a room lets them, like the cards of a deck. */
export class ThingStrip extends Box {


    constructor(views: readonly Component[], room: number){
        super("column", { gap: THING_GAP })
        let row = new Box("row", { gap: THING_GAP, align: "start" })
        let used = 0
        for(const view of views){
            const width = view.measure(Infinity).preferredWidth
            if(used > 0 && used + width > room){
                this.add(row)
                row = new Box("row", { gap: THING_GAP, align: "start" })
                used = 0
            }
            row.add(view)
            used += width + THING_GAP
        }
        this.add(row)
    }
}
