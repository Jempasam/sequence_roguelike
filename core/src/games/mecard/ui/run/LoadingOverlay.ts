import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Component, EMPTY_HINT, Label } from "../../../../engine/ui"
import type { SizeHint, Theme, UiRoot } from "../../../../engine/ui"

/** How far its text lies from the corner of the screen, in virtual pixels. */
const MARGIN = 6

/** How dark the interface gets while it shows, from 0 for not at all to 1 for black. */
const VEIL_ALPHA = 0.6

/** How long the interface takes to darken or to clear, in seconds. */
const FADE_TIME = 0.25

/** A black veil over the whole screen, fading in and out. It takes the input while it is wanted. */
class Veil extends Component {


    constructor(){
        super()
        this.visible = false
    }


    /** Is it wanted dark? Fading toward it, whatever it shows now. */
    public get wanted(): boolean { return this.#wanted }

    public set wanted(wanted: boolean){
        this.#wanted = wanted
        if(wanted) this.visible = true
        this.ticking = this.visible
        this.invalidate()
    }

    /** How dark it is now, from 0 for none to {@link VEIL_ALPHA}. */
    public get level(): number { return this.#level }


    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    protected override get interactive(): boolean {
        return this.#wanted
    }

    protected override get modal(): boolean {
        return this.#wanted
    }

    protected override arranged(): void {
        this.ticking = this.visible
    }

    protected override tick(dt: number): void {
        const step = dt / FADE_TIME * VEIL_ALPHA
        this.#level = this.#wanted ? Math.min(VEIL_ALPHA, this.#level + step) : Math.max(0, this.#level - step)
        this.invalidate()
        if(!this.#wanted && this.#level === 0){
            this.ticking = false
            this.visible = false
        } else if(this.#wanted && this.#level === VEIL_ALPHA) this.ticking = false
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        if(width === 0 || height === 0 || this.#level === 0) return
        painter.push()
        painter.setBlend("alpha")
        painter.setTint(new Color(0, 0, 0, this.#level))
        painter.rect(0, 0, width, height)
        painter.pop()
    }


    #wanted = false
    #level = 0
}

/** A small "loading" sign in a corner of a screen that darkens, over everything, put on and taken off at will. */
export class LoadingOverlay {


    constructor(ui: UiRoot, theme: Theme){
        this.#label = new Label(theme, "Chargement…", { align: "end", outline: new Color(0, 0, 0) })
        this.#label.visible = false
        const content = ui.addLayer("loading").content
        content.add(this.#veil, { x: "stretch", y: "stretch" })
        content.add(this.#label, { x: "end", y: "end", offsetX: MARGIN, offsetY: MARGIN })
    }


    /** Is it shown? */
    public get shown(): boolean { return this.#count > 0 }

    /** Show it, until each call has been answered by a {@link hide}: the screen darkens by degrees. */
    public show(): void {
        this.#count++
        this.#label.visible = true
        this.#veil.wanted = true
    }

    /** Take back one {@link show}, the screen clearing by degrees once none is left. */
    public hide(): void {
        this.#count = Math.max(0, this.#count - 1)
        if(this.#count > 0) return
        this.#label.visible = false
        this.#veil.wanted = false
    }

    /** Show it for as long as something is awaited, taken off as well when it fails. */
    public async during<Result>(work: Promise<Result>): Promise<Result> {
        this.show()
        try {
            return await work
        } finally {
            this.hide()
        }
    }


    readonly #label: Label
    readonly #veil = new Veil()
    #count = 0
}
