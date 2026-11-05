/** Something timed by a clock. */
interface Timed {
    readonly duration: number
    elapsed: number

    /** Show it once a share of its time went by, from 0 to 1. */
    show(share: number): void

    done(): void
}

/**
 * The time of the animations of a screen, told by its frames: `core` has no timer, so what waits is woken by
 * {@link FrameClock.advance}.
 */
export class FrameClock {


    /** Is anything waiting for its time? */
    public get running(): boolean {
        return this.#timed.size > 0
    }

    /** Wait for a time, in seconds: done at once when there is none to wait. */
    public wait(seconds: number): Promise<void> {
        return this.tween(seconds, () => {})
    }

    /**
     * Show something over a time, in seconds: at its start now, then at each frame, and last at its end.
     *
     * @param show - Given the share of the time gone by, from 0 to 1.
     */
    public tween(seconds: number, show: (share: number) => void): Promise<void> {
        return new Promise(done => {
            if(seconds <= 0){
                show(1)
                done()
                return
            }
            show(0)
            this.#timed.add({ duration: seconds, elapsed: 0, show, done })
        })
    }

    /** Let a frame go by, in seconds. */
    public advance(dt: number): void {
        for(const timed of [...this.#timed]){
            timed.elapsed += dt
            if(timed.elapsed >= timed.duration) this.#end(timed)
            else timed.show(timed.elapsed / timed.duration)
        }
    }

    /** End at once everything that waits, each shown at its end. */
    public finish(): void {
        for(const timed of [...this.#timed]) this.#end(timed)
    }


    readonly #timed = new Set<Timed>()

    #end(timed: Timed): void {
        this.#timed.delete(timed)
        timed.show(1)
        timed.done()
    }
}
