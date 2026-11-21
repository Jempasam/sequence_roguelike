import { release } from "./faults"
import type { Handle } from "./faults"

/**
 * A lifetime: what is kept in it is stopped when it is disposed, in the reverse of the order it was kept in. It
 * is a handle itself, so a scope is kept in another, and several handles are stopped as one by making a scope
 * of them.
 *
 * @remarks
 * What is kept after the scope was disposed is stopped at once, for nothing outlives its scope.
 */
export class Scope {


    constructor(...handles: Handle[]){
        this.track(...handles)
    }


    /** Whether the scope was disposed: what is kept in it now is stopped at once. */
    public get isDisposed(): boolean {
        return this.#isDisposed
    }

    /**
     * Keep handles, stopped with the scope or with the handle returned, whichever comes first. The one handle
     * returned stops all those given here, and no longer takes part in the scope once it did.
     */
    public track(...handles: Handle[]): { dispose(): void } {
        if(this.#isDisposed){
            for(const handle of handles.reverse()) release(handle)
            return { dispose(): void {} }
        }
        const tracked: Tracked = {
            handles,
            dispose: () => {
                if(!this.#kept.delete(tracked)) return
                for(const handle of tracked.handles.reverse()) release(handle)
            },
        }
        this.#kept.add(tracked)
        return tracked
    }

    /** Stop everything kept, once: the last kept first. */
    public dispose(): void {
        if(this.#isDisposed) return
        this.#isDisposed = true
        const kept = [...this.#kept].reverse()
        this.#kept.clear()
        for(const tracked of kept){
            for(const handle of tracked.handles.reverse()) release(handle)
        }
    }


    readonly #kept = new Set<Tracked>()
    #isDisposed = false
}

/** What is kept together, stopped as one. */
interface Tracked {
    readonly handles: Handle[]
    dispose(): void
}
