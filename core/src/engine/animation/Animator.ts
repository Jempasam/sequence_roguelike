import type { Animation } from "./Animation"

/** An animation going on, and what to tell when it is over. */
interface Playing {
    readonly animation: Animation
    readonly onEnd: (() => void)|undefined
}

/**
 * Plays animations side by side: starts them, moves them on, ends them. It works alone, with no effect.
 *
 * @remarks
 * Each animation gets its `end` once, whether it is over, fails or is stopped. An animation that fails does
 * not stop the others: its error goes to the sink.
 */
export class Animator {


    constructor(
        /** Where the error of an animation goes. */
        public readonly report: (error: unknown) => void,
    ){}


    /** How many animations are playing. */
    public get playing(): number {
        return this.#running.length
    }

    /**
     * Start an animation and play it.
     *
     * @param onEnd - Called once, after its end, when it is over or stopped.
     */
    public play(animation: Animation, onEnd?: () => void): void {
        const playing: Playing = { animation, onEnd }
        try {
            animation.start()
        }
        catch(error){
            this.report(error)
            onEnd?.()
            return
        }
        this.#running.push(playing)
    }

    /** Move the animations on, ending the ones that are over. */
    public update(dt: number): void {
        for(const playing of [...this.#running]){
            let going = false
            try {
                going = playing.animation.update(dt)
            }
            catch(error){
                this.report(error)
            }
            if(!going) this.#end(playing)
        }
    }

    /** End every animation. */
    public stop(): void {
        for(const playing of [...this.#running]) this.#end(playing)
    }


    readonly #running: Playing[] = []

    /** End an animation, once: it leaves, ends, then is told over. */
    #end(playing: Playing): void {
        const index = this.#running.indexOf(playing)
        if(index < 0) return
        this.#running.splice(index, 1)
        try {
            playing.animation.end()
        }
        catch(error){
            this.report(error)
        }
        playing.onEnd?.()
    }
}
