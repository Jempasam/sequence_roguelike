import type { Painter } from "../../../../../engine/gpu"
import { Component, EMPTY_HINT } from "../../../../../engine/ui"
import type { SizeHint } from "../../../../../engine/ui"
import type { Ambient } from "./Ambient"

/**
 * An ambient laid over the whole interface: it moves it on at each tick, and draws it again while particles
 * are alive, and once more when the last one is gone.
 */
export class AmbientOverlay extends Component {


    constructor(
        /** What it shows. */
        public readonly ambient: Ambient,
    ){
        super()
    }


    protected computeHint(): SizeHint {
        return EMPTY_HINT
    }

    protected override arranged(): void {
        this.ticking = true
    }

    protected paint(painter: Painter): void {
        this.ambient.draw(painter)
    }

    protected override tick(dt: number): void {
        this.ambient.update(dt)
        const drawn = this.ambient.active
        if(drawn || this.#drawn) this.invalidate()
        this.#drawn = drawn
    }


    /** Was something drawn at the last frame, to be cleared when nothing is left? */
    #drawn = false
}
