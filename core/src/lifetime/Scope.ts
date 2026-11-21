import type { Removable } from "./Removable"

/** What a scope keeps: a handle, or a function that undoes something. */
export type Kept = Removable|(() => void)

/**
 * A lifetime: what is kept in it is taken back when it is removed, in the reverse of the order it was kept
 * in. It is a {@link Removable} itself, so a scope is kept in another, and several handles are taken back
 * as one by making a scope of them.
 *
 * @remarks
 * What is kept after the scope was removed is taken back at once, for nothing outlives its scope. A handle
 * that throws when taken back does not stop the others: its error is thrown after all were taken back.
 */
export class Scope implements Removable {


    constructor(...kept: Kept[]){
        this.track(...kept)
    }


    /** Whether the scope was removed: what is kept in it now is taken back at once. */
    public get isRemoved(): boolean {
        return this.#isRemoved
    }

    /**
     * Keep handles, taken back with the scope or with the handle returned, whichever comes first. The one
     * handle returned takes back all those given here, and no longer takes part in the scope once it did.
     */
    public track(...kept: Kept[]): Removable {
        if(this.#isRemoved){
            takeBack(kept)
            return { remove(): void {} }
        }
        const tracked: Tracked = {
            kept,
            remove: () => {
                if(!this.#kept.delete(tracked)) return
                takeBack(tracked.kept)
            },
        }
        this.#kept.add(tracked)
        return tracked
    }

    /** Take back everything kept, once: the last kept first. */
    public remove(): void {
        if(this.#isRemoved) return
        this.#isRemoved = true
        const kept = [...this.#kept].flatMap(tracked => tracked.kept)
        this.#kept.clear()
        takeBack(kept)
    }


    readonly #kept = new Set<Tracked>()
    #isRemoved = false
}

/** What is kept together, taken back as one. */
interface Tracked extends Removable {
    readonly kept: Kept[]
}

/** Take back each, the last first, even when one throws: the first error is thrown at the end. */
function takeBack(kept: Kept[]): void {
    const errors: unknown[] = []
    for(const one of kept.slice().reverse()){
        try {
            if(typeof one === "function") one()
            else one.remove()
        } catch(error){
            errors.push(error)
        }
    }
    if(errors.length > 0) throw errors[0]
}
