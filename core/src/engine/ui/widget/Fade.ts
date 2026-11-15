import type { Painter } from "../../gpu"
import { Color } from "../../math"
import { TextLayout } from "../../text"

import { Component } from "../Component"
import { EMPTY_HINT } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import type { Theme } from "../Theme"
import type { TransitionPlay } from "./Transition"

/** How much of the play the screen is fully covered for, around its middle: the fade rises and falls in the rest. */
const FULL_FROM = 0.35
const FULL_TO = 0.65

/**
 * A transition with no painting: the screen fades to a color and back, a text white over a black outline
 * written at the center of it. It plays as a {@link Transition} does, and calls its listeners at its middle
 * and its end the same way, so it stands in for one that cannot be loaded.
 *
 * @remarks
 * Like a transition, it is shown and holds the input only while it plays, and ticks only then.
 */
export class Fade extends Component {


    constructor(
        /** The look of the text. */
        public readonly theme: Theme,

        /** What the screen fades to. */
        color: Readonly<Color>,

        /** What is written at the center of the screen. */
        public readonly text: string,
    ){
        super()
        this.#color = new Color(color.r, color.g, color.b)
        this.#layout = new TextLayout(theme.font, theme.textScale)
        this.visible = false
    }


    /** Is it playing? */
    public get playing(): boolean { return this.#play !== null }

    /** Where it stands, from 0 at its start to 1 at its end. */
    public get progress(): number { return this.#progress }

    /**
     * Play it, shown over what lies below, which takes no input meanwhile. Its tint is not read.
     *
     * @throws {@link Error} When the duration is not above 0.
     */
    public play(play: TransitionPlay): void {
        if(!(play.duration > 0)) throw new Error(`A fade plays for more than 0 seconds, not ${play.duration}.`)
        const reverse = play.reverse ?? false
        if(!this.#play) this.#progress = reverse ? 1 : 0
        this.#play = play
        this.#middlePassed = reverse ? this.#progress < MIDDLE : this.#progress > MIDDLE
        this.visible = true
        this.ticking = true
        this.invalidate()
    }

    /** Stop it where it stands and hide it, calling none of its listeners. */
    public stop(): void {
        if(!this.#play) return
        this.#play = null
        this.ticking = false
        this.visible = false
    }

    /** Nothing to free. */
    public dispose(): void {}


    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    /** It takes the pointer while it plays, so nothing below hears a click. */
    protected override get interactive(): boolean {
        return this.#play !== null
    }

    protected override get modal(): boolean {
        return this.#play !== null
    }

    protected override arranged(): void {
        this.ticking = this.#play !== null
    }

    protected override tick(dt: number): void {
        const play = this.#play
        if(!play) return
        const reverse = play.reverse ?? false
        const step = dt / play.duration
        this.#progress = Math.max(0, Math.min(1, this.#progress + (reverse ? -step : step)))
        this.invalidate()
        if(!this.#middlePassed && (reverse ? this.#progress <= MIDDLE : this.#progress >= MIDDLE)){
            this.#middlePassed = true
            play.onMiddle?.()
            // A listener playing it again or stopping it takes it over.
            if(this.#play !== play) return
        }
        if(this.#progress !== (reverse ? 0 : 1)) return
        this.stop()
        play.onEnd?.()
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        const alpha = this.#alpha
        if(width === 0 || height === 0 || alpha === 0) return
        painter.push()
        painter.setBlend("alpha")
        painter.setTint(new Color(this.#color.r, this.#color.g, this.#color.b, alpha))
        painter.rect(0, 0, width, height)
        if(this.text){
            const layout = this.#layout
            const left = Math.floor((width - layout.widthOf(this.text)) / 2)
            const top = Math.floor((height - layout.lineHeight) / 2)
            layout.drawOutlined(painter, this.text, left, top, new Color(1, 1, 1, alpha), new Color(0, 0, 0, alpha))
        }
        painter.pop()
    }


    readonly #color: Color
    readonly #layout: TextLayout
    #play: TransitionPlay|null = null
    #progress = 0
    #middlePassed = false

    /** How covered the screen is now: 1 around the middle, rising and falling by steps of the progress. */
    get #alpha(): number {
        const p = this.#progress
        if(p < FULL_FROM) return p / FULL_FROM
        if(p > FULL_TO) return (1 - p) / (1 - FULL_TO)
        return 1
    }
}

/** Where it passes its middle, covering what changes behind it. */
const MIDDLE = 0.5
