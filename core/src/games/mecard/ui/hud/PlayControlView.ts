import { Color } from "../../../../engine/math"
import { Box, Button, NineSlice, Panel } from "../../../../engine/ui"
import type { Theme } from "../../../../engine/ui"

import type { PlayControl, PlayMode } from "./PlayControl"

/** The frame around the buttons. */
const OUTLINE = new Color(0, 0, 0)

/** The frame behind the button of the mode playing. */
const ACTIVE = new Color(0.45, 0.38, 0.15, 0.9)

/** What each button shows and sets, the step one setting nothing. */
const BUTTONS: readonly { readonly text: string, readonly mode: PlayMode|null }[] = [
    { text: "||", mode: "pause" },
    { text: ">", mode: "slow" },
    { text: ">>", mode: "play" },
    { text: ">>>", mode: "fast" },
    { text: "|>", mode: null },
]

/**
 * A row of buttons choosing how a replay plays: pause, slow, play, fast forward, and a step to take while
 * paused. The one of the mode playing is lit up.
 */
export class PlayControlView extends Panel {


    constructor(
        theme: Theme,
        public readonly control: PlayControl,
    ){
        super(theme, { background: NineSlice.flat(theme.white, OUTLINE), padding: 1 })
        this.content = this.#row
        control.onChange = () => this.#build()
        this.#build()
    }


    /** The buttons, a pixel apart: the white of the panel behind shows as a frame around each. */
    readonly #row = new Box("row", { gap: 1 })

    /** Lay the buttons again from the mode. */
    #build(): void {
        for(const child of [...this.#row.children]) this.#row.remove(child)
        const lit = { ...this.theme.button, normal: NineSlice.flat(this.theme.white, ACTIVE) }
        for(const { text, mode } of BUTTONS){
            const button = new Button(this.theme, text, mode !== null && mode === this.control.mode ? { looks: lit } : {})
            button.onActivate = () => {
                if(mode === null) this.control.step()
                else this.control.mode = mode
            }
            this.#row.add(button)
        }
    }
}
