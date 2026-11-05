/** Something shown over a while, done once its promise settles. */
export type Animation = () => Promise<void>

/** An animation taking no time: what it does, in its turn. */
export function instant(act: () => void): Animation {
    return () => {
        act()
        return Promise.resolve()
    }
}

/**
 * Animations played one after the other: each starts once the one before is done, at once when none is
 * going on.
 *
 * @remarks
 * An animation that fails does not stop the chain: its error goes to the sink, and the next one starts.
 */
export class AnimationChain {


    constructor(
        /** Where the error of an animation goes. */
        public readonly report: (error: unknown) => void,
    ){}


    /** Is an animation going on, or waiting for its turn? */
    public get busy(): boolean {
        return this.#playing || this.#waiting.length > 0
    }

    /** How many animations wait for their turn, the one going on not counted. */
    public get waiting(): number {
        return this.#waiting.length
    }

    /** Add an animation at the end: started at once when nothing is going on. */
    public add(animation: Animation): void {
        this.#waiting.push(animation)
        if(!this.#playing) this.#playNext()
    }

    /** Forget every animation not started yet. The one going on is left to end. */
    public cancel(): void {
        this.#waiting.length = 0
    }


    readonly #waiting: Animation[] = []

    #playing = false

    #playNext(): void {
        const animation = this.#waiting.shift()
        this.#playing = animation !== undefined
        if(!animation) return
        this.#start(animation).catch(this.report).finally(() => this.#playNext())
    }

    /** Start an animation, its failure to start told as any other. */
    async #start(animation: Animation): Promise<void> {
        await animation()
    }
}
