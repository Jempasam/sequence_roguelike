import { Color } from "../../../../engine/math"
import { Box, Button, NineSlice, Panel } from "../../../../engine/ui"
import type { Theme } from "../../../../engine/ui"

import type { PlayControl, PlayMode } from "./PlayControl"

/** The frame around the buttons: a brown light enough to stand out of the very dark brown behind the battle. */
export const CONTROLS_FRAME = new Color(0.45, 0.32, 0.18)

/** The frame behind the button of the mode playing. */
const ACTIVE = new Color(0.45, 0.38, 0.15, 0.9)

/** What each button shows and sets, the step one setting nothing. */
const BUTTONS: readonly { readonly text: string, readonly mode: PlayMode|null }[] = [
    { text: "||", mode: "pause" },
    { text: ">", mode: "slow" },
    { text: ">>", mode: "calm" },
    { text: ">>>", mode: "play" },
    { text: ">>>>", mode: "fast" },
    { text: "|>", mode: null },
]

/**
 * A row of buttons choosing how a replay plays: pause, slow, calm, play, fast forward, and a step to take while
 * paused. The one of the mode playing is lit up.
 */
export class PlayControlView extends Panel {


    constructor(
        theme: Theme,
        public readonly control: PlayControl,
    ){
        super(theme, { background: NineSlice.flat(theme.white, CONTROLS_FRAME), padding: 1 })
        this.content = this.#row
        this.#lit = { ...theme.button, normal: NineSlice.flat(theme.white, ACTIVE) }
        for(const { text, mode } of BUTTONS){
            const button = new Button(theme, text)
            button.onActivate = () => {
                if(mode === null) this.control.step()
                else this.control.mode = mode
            }
            this.#buttons.push(button)
            this.#row.add(button)
        }
        control.onChange = () => this.#light()
        this.#light()
    }


    /** The buttons, a pixel apart: the white of the panel behind shows as a frame around each. */
    readonly #row = new Box("row", { gap: 1 })
    readonly #buttons: Button[] = []
    readonly #lit: Button["looks"]

    /** Light up the button of the mode playing, and only it. */
    #light(): void {
        BUTTONS.forEach(({ mode }, index) => {
            this.#buttons[index].looks = mode !== null && mode === this.control.mode ? this.#lit : this.theme.button
        })
    }
}
