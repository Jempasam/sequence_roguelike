import type { Painter } from "../../../../engine/gpu"
import { Component, EMPTY_HINT } from "../../../../engine/ui"
import type { SizeHint } from "../../../../engine/ui"
import type { RunParticleLink } from "./RunParticleLink"

/**
 * The particles of a run laid over the whole interface: it moves them on at each tick while some are alive,
 * and draws them again, and once more when the last one is gone.
 */
export class ParticleOverlay extends Component {


    constructor(
        /** What holds the particles. */
        public readonly link: RunParticleLink,
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
        this.link.draw(painter)
    }

    protected override tick(dt: number): void {
        const visible = this.link.active || this.#drawn
        if(!visible) return
        this.link.update(dt)
        this.#drawn = this.link.active
        this.invalidate()
    }


    /** Was something drawn at the last frame, to be cleared when nothing is left? */
    #drawn = false
}
