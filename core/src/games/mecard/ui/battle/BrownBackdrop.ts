import type { Painter } from "../../../../engine/gpu"
import { Color } from "../../../../engine/math"
import { Component, EMPTY_HINT, NineSlice, Rect } from "../../../../engine/ui"
import type { SizeHint, Theme } from "../../../../engine/ui"

/** The very dark brown behind the whole battle. */
const BROWN = new Color(0.1, 0.06, 0.03)

/** A plain very dark brown laid behind the whole battle, so no other background shows around the panels. */
export class BrownBackdrop extends Component {


    constructor(theme: Theme){
        super()
        this.#fill = NineSlice.flat(theme.white, BROWN)
    }


    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    protected paint(painter: Painter): void {
        const { width, height } = this.bounds
        this.#fill.draw(painter, 0, 0, width, height)
    }

    protected override opaqueRect(): Readonly<Rect>|null {
        const { width, height } = this.bounds
        return this.#fill.opaqueInterior(width, height, this.#opaque)
    }


    readonly #fill: NineSlice
    readonly #opaque = new Rect()
}
