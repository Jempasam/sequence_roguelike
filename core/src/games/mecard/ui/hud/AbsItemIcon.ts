import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { TextLayout } from "../../../../engine/text"
import { Component, sizeHint } from "../../../../engine/ui"
import type { SizeHint, Theme, UiEvent } from "../../../../engine/ui"
import type { Visual } from "../../sim/base/Visual"
import type { Usable } from "../../sim/usable/Usable"

import { LIT_EDGE } from "../look/colors"
import { CHOSEN_TEXT } from "../look/theme"
import type { UnitSprites } from "../look/UnitSprites"

/** The size of the picture of an item or a usable, in virtual pixels. */
export const THING_ICON_SIZE = 16

/** The size of the icon of a status, in virtual pixels. */
export const STATUS_ICON_SIZE = 9

/** The size of the icon of a process, in virtual pixels. */
export const PROCESS_ICON_SIZE = 7

/** From which scale the letters of a visual are written where its picture is missing, a square below. */
const LETTER_MIN_SCALE = 2

/** What a picture is multiplied by while its thing is spent. */
const SPENT_TINT = 0.45

/** How much darker the outline of the letters is than the letters. */
const OUTLINE_DARKNESS = 0.5

/** The color of the text, and the outline around it. */
const TEXT_COLOR = new Color(1, 1, 1)
const TEXT_OUTLINE = new Color(0, 0, 0)

/** The silhouette of a hovered icon. */
const HOVER_EDGE = new Color(1, 1, 1)

/** The eight ways a picture is drawn again around itself to outline it. */
const AROUND: readonly (readonly [number, number])[] = [
    [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
]

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
 * An icon with a text over its bottom right corner, abstract: it knows a look and a text, not what they
 * stand for. Where the picture is missing, the letters of the look are written in its color, or a square
 * in it when drawn too small to read them.
 *
 * The text keeps its size whatever the scale of the icon. An activation, even an empty one, tells the icon
 * is used and outlines it in yellow, its text written in yellow over the top right corner. The pointer
 * coming over it, or lighting it, outlines it in white instead.
 */
export class AbsItemIcon extends Component {


    /** What the pointer coming over it or leaving does, nothing when none. */
    public onHover: ((over: boolean) => void)|null = null

    /** What a click does, nothing when none. */
    public onPick: (() => void)|null = null

    constructor(
        public readonly theme: Theme,
        public readonly sprites: UnitSprites,
        visual: Visual,
        text = "",

        /** How many times larger than its base size it is drawn, the picture and its outline. */
        public readonly scale = 1,

        iconSize = STATUS_ICON_SIZE,
    ){
        super()
        this.#visual = visual
        this.#text = text
        this.#iconSize = iconSize
        this.#layout = new TextLayout(theme.font, theme.textScale)
    }


    /** The size of its picture at scale 1, in virtual pixels. */
    public get iconSize(): number { return this.#iconSize }

    public set iconSize(iconSize: number){
        if(iconSize === this.#iconSize) return
        this.#iconSize = iconSize
        this.invalidateLayout()
    }

    /** How it looks. */
    public get visual(): Visual { return this.#visual }

    public set visual(visual: Visual){
        if(visual === this.#visual) return
        this.#visual = visual
        this.invalidate()
    }

    /** What is written over its bottom right corner, nothing when empty. */
    public get text(): string { return this.#text }

    public set text(text: string){
        if(text === this.#text) return
        this.#text = text
        this.invalidate()
    }

    /**
     * What is written in yellow over its top right corner. None tells it is not used; an empty text, that it
     * is used and has nothing to say: it is outlined in yellow all the same.
     */
    public get activation(): string|null { return this.#activation }

    public set activation(activation: string|null){
        if(activation === this.#activation) return
        this.#activation = activation
        this.invalidate()
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
        const size = this.iconSize * this.scale
        return sizeHint(size, size)
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
        const { iconSize, scale } = this
        const visual = this.#visual
        const [r, g, b] = visual.coloration ?? [1, 1, 1]
        const shade = this.#spent ? SPENT_TINT : 1
        const edge = this.hovered || this.#lit ? HOVER_EDGE : this.#activation !== null ? CHOSEN_TEXT : null
        const picture = this.sprites.thing(visual)
        const size = iconSize * scale
        painter.push()
        painter.scale(scale, scale)
        if(picture){
            if(edge){
                painter.setColorMode("mask")
                painter.setTint(edge)
                for(const [dx, dy] of AROUND) painter.sprite(picture, dx, dy)
                painter.setColorMode("modulate")
            }
            painter.setTint(new Color(r * shade, g * shade, b * shade))
            painter.sprite(picture, 0, 0)
            painter.pop()
        }
        else {
            painter.setWhitePixel(this.theme.white)
            if(edge){
                painter.setTint(edge === HOVER_EDGE ? LIT_EDGE : edge)
                painter.rect(-1, -1, iconSize + 2, iconSize + 2)
            }
            const [cr, cg, cb] = visual.color
            if(scale < LETTER_MIN_SCALE){
                painter.setTint(new Color(cr * shade, cg * shade, cb * shade))
                painter.rect(1, 1, iconSize - 2, iconSize - 2)
            }
            painter.pop()
            if(scale >= LETTER_MIN_SCALE) this.#paintLetters(painter, size, cr * shade, cg * shade, cb * shade)
        }
        this.#paintTexts(painter, size)
    }

    /** The letters of the look, centered, in its color over an outline of the same color but darker. */
    #paintLetters(painter: Painter, size: number, r: number, g: number, b: number): void {
        const layout = this.#layout
        const letters = this.#visual.letter
        const color = new Color(r, g, b)
        const outline = new Color(r * OUTLINE_DARKNESS, g * OUTLINE_DARKNESS, b * OUTLINE_DARKNESS)
        painter.push()
        layout.drawOutlined(
            painter, letters,
            Math.floor((size - layout.widthOf(letters)) / 2), Math.floor((size - layout.lineHeight) / 2),
            color, outline,
        )
        painter.pop()
    }

    /** The text and the activation, outside the scale, on the corners of the icon. */
    #paintTexts(painter: Painter, size: number): void {
        const layout = this.#layout
        painter.push()
        if(this.#text) layout.drawOutlined(
            painter, this.#text, size - layout.widthOf(this.#text), size - layout.lineHeight,
            TEXT_COLOR, TEXT_OUTLINE,
        )
        const activation = this.#activation
        if(activation) layout.drawOutlined(
            painter, activation, size - layout.widthOf(activation), 0, CHOSEN_TEXT, TEXT_OUTLINE,
        )
        painter.pop()
    }


    readonly #layout: TextLayout
    #visual: Visual
    #text: string
    #iconSize: number
    #activation: string|null = null
    #lit = false
    #spent = false
}
