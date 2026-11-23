import type { Gpu } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { NineSlice } from "../../../../engine/ui"
import type { ButtonOptions, StateLooks, Theme } from "../../../../engine/ui"

import { pixelFont } from "./pixelFont"
import { PictureShelf } from "./pictureShelf"
import { mecardDisplay } from "./textDisplay"

/** The color of the text that matters less: hints, hidden cards. */
export const DIM_TEXT = new Color(0.72, 0.64, 0.48)

/** The color of what is chosen: the selected card, the hero being planned. */
export const CHOSEN_TEXT = new Color(1, 0.85, 0.35)

/** The outline around a text lying on a scene rather than a panel, so it reads on any picture. */
export const TEXT_OUTLINE = new Color(0, 0, 0)

/** The color of a text in a speech bubble, dark on its white. */
export const BUBBLE_TEXT = new Color(0.1, 0.09, 0.14)

/** The color of the warnings. */
export const WARNING_TEXT = new Color(1, 0.45, 0.4)

/** The colors of text on a light background such as paper: plain, dim, and warning. */
export const INK_TEXT = new Color(0.05, 0.03, 0.02)
export const DIM_INK_TEXT = new Color(0.3, 0.22, 0.15)
export const WARNING_INK_TEXT = new Color(0.6, 0.1, 0.08)

/** The color of a stat above its base. */
export const STAT_UP = new Color(0.5, 1, 0.5)

/** The color of a stat below its base. */
export const STAT_DOWN = new Color(1, 0.45, 0.4)

/** The looks of the buttons over paper: dark brown, under the beige text of the theme. Cached by theme. */
const BROWN_LOOKS = new WeakMap<Theme, Theme["button"]>()

export function brownButtonLooks(theme: Theme): Theme["button"] {
    const known = BROWN_LOOKS.get(theme)
    if(known) return known
    const flat = (r: number, g: number, b: number) => NineSlice.flat(theme.white, new Color(r, g, b))
    const looks = {
        normal: flat(0.24, 0.14, 0.07), hovered: flat(0.36, 0.22, 0.11), pressed: flat(0.15, 0.08, 0.04),
        focused: flat(0.4, 0.26, 0.12), disabled: flat(0.2, 0.15, 0.11), padding: theme.button.padding,
    }
    BROWN_LOOKS.set(theme, looks)
    return looks
}

/** The options of a brown button under a yellowish white text. Cached by theme. */
const BROWN_BUTTONS = new WeakMap<Theme, ButtonOptions>()

export function brownButton(theme: Theme): ButtonOptions {
    const known = BROWN_BUTTONS.get(theme)
    if(known) return known
    const options: ButtonOptions = {
        looks: brownButtonLooks(theme),
        textColor: new Color(1, 0.96, 0.8), disabledTextColor: new Color(0.6, 0.55, 0.4),
    }
    BROWN_BUTTONS.set(theme, options)
    return options
}

/** The options of a button over a dark background: a beige frame under dark brown text. Cached by theme. */
const BEIGE_BUTTONS = new WeakMap<Theme, ButtonOptions>()

export function beigeButton(theme: Theme): ButtonOptions {
    const known = BEIGE_BUTTONS.get(theme)
    if(known) return known
    const flat = (r: number, g: number, b: number) => NineSlice.flat(theme.white, new Color(r, g, b))
    const options: ButtonOptions = {
        looks: {
            normal: flat(0.85, 0.77, 0.6), hovered: flat(0.95, 0.88, 0.7), pressed: flat(0.68, 0.6, 0.45),
            focused: flat(1, 0.92, 0.7), disabled: flat(0.5, 0.45, 0.36), padding: theme.button.padding,
        },
        textColor: new Color(0.22, 0.12, 0.05), disabledTextColor: new Color(0.35, 0.3, 0.22),
    }
    BEIGE_BUTTONS.set(theme, options)
    return options
}

/**
 * The look of the interface: flat frames in the colors of a dungeon, and the pixel font. Everything lies on
 * the texture of the font, so the interface draws in one batch.
 */
export function mecardTheme(gpu: Gpu): Theme {
    const { font, white } = pixelFont(gpu)
    const flat = (r: number, g: number, b: number, a = 1) => NineSlice.flat(white, new Color(r, g, b, a))
    const looks = (): StateLooks => ({
        normal: flat(0.24, 0.14, 0.07), hovered: flat(0.36, 0.22, 0.11), pressed: flat(0.15, 0.08, 0.04),
        focused: flat(0.4, 0.26, 0.12), disabled: flat(0.2, 0.15, 0.11),
    })
    return {
        font, textScale: 1, white,
        textColor: new Color(1, 0.96, 0.8), disabledTextColor: new Color(0.6, 0.55, 0.4),
        textDisplay: mecardDisplay, textPictures: new PictureShelf(),
        focusRing: flat(1, 0.85, 0.35, 0.6),
        panel: { background: flat(0.12, 0.08, 0.05, 0.94), padding: 4 },
        button: { ...looks(), padding: 2 },
        slider: {
            track: flat(0.2, 0.2, 0.2), thumb: flat(0.8, 0.8, 0.8), thumbWidth: 4, width: 44, height: 8,
        },
        scrollbar: {
            track: flat(0.17, 0.11, 0.07), thumb: flat(0.55, 0.42, 0.26), thumbHover: flat(0.8, 0.68, 0.45), width: 4, minThumb: 6,
        },
        textInput: {
            background: flat(0, 0, 0), padding: 2, width: 60,
            cursorColor: new Color(), selectionColor: new Color(0.55, 0.38, 0.12),
        },
        menu: { background: flat(0.12, 0.08, 0.05), padding: 1, entry: { ...looks(), padding: 1 } },
        tooltip: { background: flat(0.06, 0.04, 0.02, 0.95), padding: 2 },
    }
}
