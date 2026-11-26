import type { Painter } from "../../../../engine/gpu"
import { Component, EMPTY_HINT } from "../../../../engine/ui"
import type { SizeHint } from "../../../../engine/ui"
import type { RunParticleLink } from "./RunParticleLink"

/**
 * The particles of a run laid over the whole interface: it moves them on at each tick, and draws them
 * again while some are alive, and once more when the last one is gone. On the map it ticks even when none
 * is alive, for the ambient to count its waits, but draws nothing until one is.
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
        if(!visible && !this.link.onMap) return
        this.link.update(dt)
        this.#drawn = this.link.active
        if(visible || this.#drawn) this.invalidate()
    }


    /** Was something drawn at the last frame, to be cleared when nothing is left? */
    #drawn = false
}
