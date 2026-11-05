import type { Painter } from "../../gpu"

import { ContentContainer } from "../Container"
import type { NineSlice } from "../NineSlice"
import { Rect } from "../Rect"
import { EMPTY_HINT, paddedHint } from "../SizeHint"
import type { SizeHint } from "../SizeHint"
import type { Theme } from "../Theme"

/** How a panel is set up beyond its theme. */
export interface PanelOptions {
    /** Its frame, the panel frame of the theme by default. */
    readonly background?: NineSlice|null

    /** The space between its frame and its content, in virtual pixels, the one of the theme by default. */
    readonly padding?: number

    /** Does it stop the pointer over its bounds, so a click on it never reaches the world? Yes by default. */
    readonly interactive?: boolean
}

/**
 * A nine-slice frame with a padding around one child: the base of frames, windows and the HUD.
 *
 * @remarks
 * It is opaque over its bounds less the margins of its frame, when the center of the frame is opaque, so
 * a change inside it draws again from it, and nothing below.
 */
export class Panel extends ContentContainer {


    constructor(
        /** The look of the panel. */
        public readonly theme: Theme,

        options: PanelOptions = {},
    ){
        super()
        this.#background = options.background === undefined ? theme.panel.background : options.background
        this.#padding = options.padding ?? theme.panel.padding
        this.#interactive = options.interactive ?? true
    }


    /** Its frame, none for none. Setting the same one does nothing. */
    public get background(): NineSlice|null { return this.#background }

    public set background(background: NineSlice|null){
        if(background === this.#background) return
        this.#background = background
        this.invalidate()
    }

    /** The space between its frame and its content, in virtual pixels. */
    public get padding(): number { return this.#padding }

    public set padding(padding: number){
        if(padding === this.#padding) return
        this.#padding = padding
        this.invalidateLayout()
    }


    protected override get interactive(): boolean {
        return this.#interactive
    }

    protected computeHint(maxWidth: number): SizeHint {
        const padding = this.#padding
        const content = this.content
        const hint = content?.visible ? content.measure(maxWidth - 2 * padding) : EMPTY_HINT
        return paddedHint(hint, 2 * padding, 2 * padding)
    }

    protected override arranged(): void {
        const content = this.content
        if(!content?.visible) return
        const padding = this.#padding
        const { width, height } = this.bounds
        const inner = this.#rect.set(padding, padding, width - 2 * padding, height - 2 * padding)
        inner.width = Math.max(0, inner.width)
        inner.height = Math.max(0, inner.height)
        this.place(content, inner)
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        this.#background?.draw(painter, 0, 0, width, height)
    }

    protected override opaqueRect(): Readonly<Rect>|null {
        const { width, height } = this.bounds
        return this.#background?.opaqueInterior(width, height, this.#opaque) ?? null
    }


    #background: NineSlice|null
    #padding: number
    readonly #interactive: boolean
    readonly #rect = new Rect()
    readonly #opaque = new Rect()
}
