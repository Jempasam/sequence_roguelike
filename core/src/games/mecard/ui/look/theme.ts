import type { Gpu } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { NineSlice } from "../../../../engine/ui"
import type { StateLooks, Theme } from "../../../../engine/ui"

import { pixelFont } from "./pixelFont"
import { mecardDisplay } from "./textDisplay"

/** The color of the text that matters less: hints, hidden cards. */
export const DIM_TEXT = new Color(0.55, 0.55, 0.65)

/** The color of what is chosen: the selected card, the hero being planned. */
export const CHOSEN_TEXT = new Color(1, 0.85, 0.35)

/** The outline around a text lying on a scene rather than a panel, so it reads on any picture. */
export const TEXT_OUTLINE = new Color(0, 0, 0)

/** The color of a text in a speech bubble, dark on its white. */
export const BUBBLE_TEXT = new Color(0.1, 0.09, 0.14)

/** The color of the warnings. */
export const WARNING_TEXT = new Color(1, 0.45, 0.4)

/** The color of a stat above its base. */
export const STAT_UP = new Color(0.5, 1, 0.5)

/** The color of a stat below its base. */
export const STAT_DOWN = new Color(1, 0.45, 0.4)

/**
 * The look of the interface: flat frames in the colors of a dungeon, and the pixel font. Everything lies on
 * the texture of the font, so the interface draws in one batch.
 */
export function mecardTheme(gpu: Gpu): Theme {
    const { font, white } = pixelFont(gpu)
    const flat = (r: number, g: number, b: number, a = 1) => NineSlice.flat(white, new Color(r, g, b, a))
    const looks = (): StateLooks => ({
        normal: flat(0.2, 0.18, 0.28), hovered: flat(0.32, 0.28, 0.44), pressed: flat(0.12, 0.1, 0.18),
        focused: flat(0.3, 0.3, 0.5), disabled: flat(0.14, 0.13, 0.18),
    })
    return {
        font, textScale: 1, white,
        textColor: new Color(0.93, 0.9, 0.85), disabledTextColor: new Color(0.42, 0.4, 0.48),
        textDisplay: mecardDisplay,
        focusRing: flat(1, 0.85, 0.35, 0.6),
        panel: { background: flat(0.08, 0.07, 0.12, 0.94), padding: 4 },
        button: { ...looks(), padding: 2 },
        slider: {
            track: flat(0.2, 0.2, 0.2), thumb: flat(0.8, 0.8, 0.8), thumbWidth: 4, width: 44, height: 8,
        },
        scrollbar: { track: flat(0.15, 0.14, 0.2), thumb: flat(0.5, 0.45, 0.6), width: 4, minThumb: 6 },
        textInput: {
            background: flat(0, 0, 0), padding: 2, width: 60,
            cursorColor: new Color(), selectionColor: new Color(0.3, 0.3, 0.7),
        },
        menu: { background: flat(0.08, 0.07, 0.12), padding: 1, entry: { ...looks(), padding: 1 } },
        tooltip: { background: flat(0.02, 0.02, 0.05, 0.95), padding: 2 },
    }
}
