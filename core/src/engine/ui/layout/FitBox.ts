import { internals } from "../Component"
import { ContentContainer } from "../Container"
import { Rect } from "../Rect"
import { EMPTY_HINT, sizeHint } from "../SizeHint"
import type { Size, SizeHint } from "../SizeHint"

/**
 * How a fitting sizes its content:
 * - `{ mode: "ratio", ratio }`: the largest rectangle of a width to height ratio that fits, centered.
 * - `{ mode: "integer", width, height }`: the largest whole multiple of a base size that fits, centered,
 *   which keeps pixel art sharp: a sprite shown in a menu, a portrait enlarged. When not even one time
 *   fits, the content gets one time anyway, and is cut.
 */
export type FitMode =
    | { readonly mode: "ratio", readonly ratio: number }
    | { readonly mode: "integer", readonly width: number, readonly height: number }

/**
 * One child, as large as fits, centered, at a ratio or at a whole scale. The bands left around are empty:
 * a background, when wanted, is a sibling in a `Stack`.
 */
export class FitBox extends ContentContainer {


    constructor(fit: FitMode){
        super()
        this.#fit = fit
    }


    public get fit(): FitMode { return this.#fit }

    public set fit(fit: FitMode){
        this.#fit = fit
        this.invalidateLayout()
    }

    /** The whole scale the content is drawn at in the `"integer"` mode, 1 in the `"ratio"` mode. */
    public get scale(): number { return this.#scale }


    protected computeHint(maxWidth: number): SizeHint {
        const fit = this.#fit
        if(fit.mode === "integer") return sizeHint(fit.width, fit.height)
        const content = this.content
        if(!content?.visible) return EMPTY_HINT
        const preferred = content.measure(maxWidth)
        return sizeHint(0, 0, preferred.preferredWidth, preferred.preferredHeight)
    }

    /** Draws nothing of its own: its children draw. */
    protected paint(): void {}

    protected override viewport(): Readonly<Rect>|null {
        const content = this.content
        if(!content) return null
        const own = this.#viewport.set(0, 0, this.bounds.width, this.bounds.height)
        return own.contains(internals.boundsOf(content)) ? null : own
    }

    protected override arranged(): void {
        const content = this.content
        if(!content?.visible) return
        const { width, height } = this.bounds
        const size = this.#fitted(width, height)
        const x = Math.floor((width - size.width) / 2)
        const y = Math.floor((height - size.height) / 2)
        this.place(content, this.#rect.set(x, y, size.width, size.height))
    }


    #fit: FitMode
    #scale = 1
    readonly #rect = new Rect()
    readonly #viewport = new Rect()

    #fitted(width: number, height: number): Size {
        const fit = this.#fit
        if(fit.mode === "integer"){
            const scale = Math.max(1, Math.floor(Math.min(width / fit.width, height / fit.height)))
            if(scale !== this.#scale){
                this.#scale = scale
                this.invalidate()
            }
            return { width: fit.width * scale, height: fit.height * scale }
        }
        const fitsWide = width / height > fit.ratio
        return fitsWide
            ? { width: Math.floor(height * fit.ratio), height }
            : { width, height: Math.floor(width / fit.ratio) }
    }
}
