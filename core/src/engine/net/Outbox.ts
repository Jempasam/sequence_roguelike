/** What an {@link Outbox} keeps by default: more than a game says in the grace it gives a client. */
export const OUTBOX_LIMIT = 1000

/**
 * What was said to someone who cannot be reached, kept in the order it was said until it can be: the
 * oldest is dropped when there is too much, since what is kept is not unbounded.
 *
 * @remarks
 * Nothing here knows what the messages are for, nor who they go to.
 */
export class Outbox {


    constructor(
        /** The most messages it keeps. */
        private readonly limit: number = OUTBOX_LIMIT,
    ){}


    /** How many messages are kept. */
    public get size(): number { return this.#messages.length }

    /**
     * Keep a message, after the others.
     *
     * @returns Whether it dropped the oldest to keep it, the first time since it was last emptied: a flood of
     *   messages is told once, not each.
     */
    public hold(message: string): boolean {
        this.#messages.push(message)
        if(this.#messages.length <= Math.max(1, this.limit)) return false
        this.#messages.shift()
        const first = !this.#overflowed
        this.#overflowed = true
        return first
    }

    /** Give each message kept, in the order they were kept, and forget them. */
    public drain(send: (message: string) => void): void {
        const messages = this.#messages.splice(0)
        this.#overflowed = false
        for(const message of messages) send(message)
    }

    /** Forget the messages kept. */
    public clear(): void {
        this.#messages.length = 0
        this.#overflowed = false
    }


    readonly #messages: string[] = []
    #overflowed = false
}
