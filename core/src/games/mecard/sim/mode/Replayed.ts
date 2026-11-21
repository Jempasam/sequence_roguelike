import { Observable } from "../base/Observable"
import type { Observer } from "../base/Observable"

/**
 * An observable that tells its last value to a listener that comes late: what already happened is not missed
 * by one that waits for it after it happened, as `until(said | invalidated)` does.
 */
export class Replayed<T> extends Observable<T> {


    public override add(listener: (event: T) => void): Observer {
        if(this.#has) listener(this.#last as T)
        return super.add(listener)
    }

    public override notify(event: T): void {
        this.#has = true
        this.#last = event
        super.notify(event)
    }


    #has = false
    #last: T|undefined
}
