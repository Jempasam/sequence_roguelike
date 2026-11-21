/**
 * A decision that is made once: the result of a match, the end of a game, a round that starts. When two sources
 * meet it at the same time (a result and a quit, an expiry and an arrival), the first one settles it and the
 * other is told it came second.
 */
export class Settle<T> {


    /** Is it settled? */
    public get isSettled(): boolean {
        return this.#settled
    }

    /** What it was settled with, none while it is not. */
    public get value(): T|undefined {
        return this.#value
    }

    /**
     * Settle it.
     *
     * @returns `false` when it was settled already: the caller does nothing, and the first one stands.
     */
    public settle(value: T): boolean {
        if(this.#settled) return false
        this.#settled = true
        this.#value = value
        return true
    }


    #settled = false
    #value: T|undefined
}
