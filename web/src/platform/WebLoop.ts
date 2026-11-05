import type { LoopPort } from "@game/core"

/**
 * Runs the frames on `requestAnimationFrame`, which the browser paces to the display.
 */
export class WebLoop implements LoopPort {


    #request: number|null = null
    #last = 0

    start(frame: (dtMs: number) => void): void {
        if(this.#request !== null) throw new Error("WebLoop already started. Call stop() first.")
        const tick = (now: number) => {
            const dtMs = now - this.#last
            this.#last = now
            this.#request = requestAnimationFrame(tick)
            frame(dtMs)
        }
        this.#request = requestAnimationFrame(now => {
            this.#last = now
            this.#request = requestAnimationFrame(tick)
        })
    }

    stop(): void {
        if(this.#request === null) return
        cancelAnimationFrame(this.#request)
        this.#request = null
    }
}
