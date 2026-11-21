import type { Observer } from "./Removable"

/** Where the errors of listeners go, since the simulation has no I/O to log them. */
export type ErrorSink = (error: unknown) => void

/**
 * Something that happens, which listeners are told of: a hit, a wound, the end of a round, a peer who joined.
 *
 * @remarks
 * The listeners are called in the order they were added, on a copy of the list, so one that adds or
 * removes another during a notification changes the next one, not this one: the simulation stays
 * deterministic. Each listener runs in its own `try`/`catch`, so a bug in one effect never stops the
 * others. Its error goes to the sink of the observable rather than vanishing.
 */
export class Observable<T> {


    constructor(
        /** Where the error of a listener goes. */
        public readonly report: ErrorSink,
    ){}


    /** How many listeners it calls. */
    public get size(): number { return this.#listeners.length }

    /** Call a listener at every notification, until the returned observer is removed. */
    public add(listener: (event: T) => void): Observer {
        const entry = { listener }
        this.#listeners.push(entry)
        return {
            remove: () => {
                const index = this.#listeners.indexOf(entry)
                if(index >= 0) this.#listeners.splice(index, 1)
            },
        }
    }

    /** Tell every listener of an event, in the order they were added. */
    public notify(event: T): void {
        for(const entry of [...this.#listeners]){
            try {
                entry.listener(event)
            } catch(error){
                this.report(error)
            }
        }
    }

    /** Remove every listener. */
    public clear(): void {
        this.#listeners.length = 0
    }


    /** The listeners, each wrapped so the same function added twice is removed once at a time. */
    readonly #listeners: { listener: (event: T) => void }[] = []
}

/**
 * An observable whose listeners may fail without breaking the code that tells it: the failure of a listener
 * is a bug, which is written to the console rather than thrown, for nothing in the sync and the net throws.
 */
export function signal<T>(): Observable<T> {
    return new Observable<T>(error => console.error("A listener failed:", error))
}
