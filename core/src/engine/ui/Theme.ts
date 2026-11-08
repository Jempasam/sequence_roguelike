import type { TextDisplay } from "../../semantic"
import type { Sprite } from "../gpu"
import type { Color } from "../math"
import type { BitmapFont } from "../text"

import type { NineSlice } from "./NineSlice"

/** The frames of a widget in each of its states. */
export interface StateLooks {
    readonly normal: NineSlice
    readonly hovered: NineSlice
    readonly pressed: NineSlice

    /** The frame while it has the focus and the keyboard or a gamepad is used. */
    readonly focused: NineSlice

    readonly disabled: NineSlice
}

/**
 * The look of every widget: fonts, frames, colors and the focus indicator. Passed to the constructor of
 * each widget, with no singleton, so the debug layer can have its own, denser and more legible.
 *
 * @remarks
 * Every sprite of a theme, its font included, lies in one atlas, with its white pixel: a change of
 * texture from one widget to the next would break the batch.
 */
export interface Theme {
    readonly font: BitmapFont

    /** The whole factor the font is drawn at. */
    readonly textScale: number

    /** A white region of the atlas, 2 by 2 texels at least, for the flat fills: a cursor, a selection. */
    readonly white: Sprite

    readonly textColor: Color
    readonly disabledTextColor: Color

    /** How the paragraphs show the objects of their texts, each telling itself by default. */
    readonly textDisplay?: TextDisplay

    /** The frame drawn over a focused widget that has no focused look of its own. */
    readonly focusRing: NineSlice

    readonly panel: {
        readonly background: NineSlice
        readonly padding: number
    }

    readonly button: StateLooks & {
        readonly padding: number
    }

    readonly slider: {
        readonly track: NineSlice
        readonly thumb: NineSlice

        /** The width of the thumb, in virtual pixels. */
        readonly thumbWidth: number

        /** The size a slider asks for, in virtual pixels. */
        readonly width: number
        readonly height: number
    }

    readonly scrollbar: {
        readonly track: NineSlice
        readonly thumb: NineSlice

        /** The thumb while the pointer is over the bar or holds the thumb: lighter, so it is seen to be grabbed. */
        readonly thumbHover: NineSlice

        /** The width of the bar, in virtual pixels. */
        readonly width: number

        /** The shortest the thumb gets, in virtual pixels, so it stays easy to grab. */
        readonly minThumb: number
    }

    readonly textInput: {
        readonly background: NineSlice
        readonly padding: number
        readonly cursorColor: Color
        readonly selectionColor: Color

        /** The width a field asks for, in virtual pixels. */
        readonly width: number
    }

    readonly menu: {
        readonly background: NineSlice
        readonly padding: number
        readonly entry: StateLooks & {
            readonly padding: number
        }
    }

    readonly tooltip: {
        readonly background: NineSlice
        readonly padding: number
    }
}
