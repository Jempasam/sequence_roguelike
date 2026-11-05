import type { Sdl } from "@kmamal/sdl"
import type { LoopPort } from "@game/core"

/**
 * Runs the frames back to back until the window is destroyed. The window has vsync on, so the swap in
 * `present()` blocks until the next refresh, and that is what paces the loop.
 */
export class SdlLoop implements LoopPort {


    readonly #window: Sdl.Video.Window
    #running = false

    constructor(window: Sdl.Video.Window){
        this.#window = window
    }


    start(frame: (dtMs: number) => void): void {
        if(this.#running) throw new Error("SdlLoop already started. Call stop() first.")
        this.#running = true
        let last = performance.now()
        const tick = () => {
            if(!this.#running || this.#window.destroyed) return
            const now = performance.now()
            frame(now - last)
            last = now
            // setImmediate, not a plain loop, so SDL events and network callbacks run between frames.
            setImmediate(tick)
        }
        setImmediate(tick)
    }

    stop(): void {
        this.#running = false
    }
}
