import { Observable } from "../base/Observable"
import type { ErrorSink } from "../base/Observable"

/**
 * Names an observer of a battle or of a unit, and says what it tells: declared once, as a constant, by the
 * mechanic it belongs to.
 */
export abstract class ObserverKey<T> {


    /** What its observer tells, for the types only: never set. */
    public declare readonly told?: T

    constructor(
        public readonly name: string,
    ){}
}

/** The key of what the simulation reacts to. */
export class TriggerKey<T> extends ObserverKey<T> {}

/**
 * The key of what a screen shows: the move going on is told before, and whoever follows everything a battle
 * shows hears it.
 */
export class SignalKey<T> extends ObserverKey<T> {


    /** Every signal key made so far. */
    public static get declared(): readonly SignalKey<unknown>[] {
        return SignalKey.#declared
    }

    static readonly #declared: SignalKey<unknown>[] = []

    constructor(name: string){
        super(name)
        SignalKey.#declared.push(this)
    }
}

/** An observable running something before it tells its listeners. */
export class Signal<T> extends Observable<T> {


    constructor(report: ErrorSink, private readonly before: () => void){
        super(report)
    }


    public override notify(event: T): void {
        this.before()
        super.notify(event)
    }
}

/** The observers of a battle or of a unit, one for each key, made when first asked for. */
export class ObserverMap {


    /**
     * @param before - What runs before each signal is told: the battle tells the move going on first.
     */
    constructor(
        private readonly report: ErrorSink,
        private readonly before: () => void = () => {},
    ){}


    /** The observer of a key, always the same one. */
    public of<T>(key: ObserverKey<T>): Observable<T> {
        const held = this.#observables.get(key) as Observable<T>|undefined
        if(held) return held
        const made = key instanceof SignalKey
            ? new Signal<T>(this.report, this.before)
            : new Observable<T>(this.report)
        this.#observables.set(key, made)
        return made
    }

    /** The observer of every signal key, even never asked for, so none is forgotten by whoever follows them. */
    public shown(): Observable<unknown>[] {
        return SignalKey.declared.map(key => this.of(key))
    }


    readonly #observables = new Map<ObserverKey<unknown>, unknown>()
}
