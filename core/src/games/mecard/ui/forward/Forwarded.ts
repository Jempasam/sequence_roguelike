import type { Observable, Observer } from "../../sim/base/Observable"

/** An observable of any kind of event, since an observable of one kind is no observable of another. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyObservable = Observable<any>

/** The moment of an animation a forward tells of: its start, or its end. */
export type ForwardPhase = "start"|"end"

/** What hears the event of an observable at the moments its animation plays. */
export type ForwardHandler<T> = (value: T, phase: ForwardPhase) => void

/** A handler, wrapped so the same function added twice is removed once at a time. */
interface Entry {
    readonly handler: ForwardHandler<unknown>
}

/**
 * Where what a screen plays is told as it plays: for each animation added by an observable, the screen tells
 * the observable and the value it notified, when the animation starts and when it ends.
 *
 * @remarks
 * The start is told before the screen shows the event, the end after: see {@link forwardAround}. What needs
 * the scene as the event leaves it listens to the end.
 *
 * What reacts to the pace of the screen, the sounds or the particles, listens here rather than to the
 * observables themselves, which tell everything at once. It knows only observables and their values, nothing
 * of the screen: another interface tells it the same way.
 */
export class Forwarded {


    constructor(
        /** Where the error of a handler goes. */
        public readonly report: (error: unknown) => void,
    ){}


    /** Call a handler at the start and at the end of each animation an observable added, until removed. */
    public on<T>(observable: Observable<T>, handler: ForwardHandler<T>): Observer {
        const entry: Entry = { handler: handler as ForwardHandler<unknown> }
        const entries = this.#entries.get(observable) ?? []
        entries.push(entry)
        this.#entries.set(observable, entries)
        return {
            remove: () => {
                const held = this.#entries.get(observable)
                if(!held) return
                const index = held.indexOf(entry)
                if(index >= 0) held.splice(index, 1)
                if(held.length === 0) this.#entries.delete(observable)
            },
        }
    }

    /** Tell the handlers of an observable that the animation of one of its events starts or ends. */
    public forward<T>(observable: Observable<T>, value: T, phase: ForwardPhase): void {
        for(const entry of [...this.#entries.get(observable) ?? []]){
            try {
                entry.handler(value, phase)
            } catch(error){
                this.report(error)
            }
        }
    }


    readonly #entries = new Map<object, Entry[]>()
}
