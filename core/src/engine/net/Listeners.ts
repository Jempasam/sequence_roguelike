/**
 * The handlers of one kind of event, called in the order they were added, on a copy of the list, so a
 * handler that removes itself or adds another changes the next event, not this one.
 */
export class Listeners<T> {


    /** Call a handler at every event, until the returned handle is disposed. */
    public add(handler: (event: T) => void): { dispose(): void } {
        const entry = { handler }
        this.#entries.push(entry)
        return {
            dispose: () => {
                const index = this.#entries.indexOf(entry)
                if(index >= 0) this.#entries.splice(index, 1)
            },
        }
    }

    /** Tell every handler of an event. */
    public emit(event: T): void {
        for(const entry of [...this.#entries]) entry.handler(event)
    }

    public clear(): void {
        this.#entries.length = 0
    }


    /** The handlers, each wrapped so the same function added twice is removed once at a time. */
    readonly #entries: { handler: (event: T) => void }[] = []
}
