/**
 * A token that moves on at each round, turn or match: a callback takes the one standing when it is
 * registered, and compares it when it runs, so what is late (a timer, an answer, a progress) does nothing.
 */
export class Epoch {


    /** The one standing. */
    public get current(): number {
        return this.#current
    }

    /** Move on: what was registered under the one before is stale now. */
    public next(): number {
        return ++this.#current
    }

    /** Is this still the one standing? */
    public is(token: number): boolean {
        return token === this.#current
    }


    #current = 0
}
