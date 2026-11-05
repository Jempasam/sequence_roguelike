import { flagText, numberText } from "./text"

/** A change made to the value of an {@link Attribute}. */
export interface Modifier<T> {
    /** When it applies among the others, the lowest first. */
    readonly order: number

    /** The value after the change. */
    apply(value: T): T
}

/**
 * What a modifier is added under, so its owner takes it back: an item, a status. Compared by reference, so
 * two owners never take back each other's modifier.
 */
export class ModifierKey {


    constructor(
        /** What it stands for, for debugging only. */
        public readonly name: string,
    ){}


    public toString(): string { return this.name }
}

/** What hears of the modifiers of an {@link Attribute}, each kind of change on its own. */
export interface AttributeWatcher {
    added(key: ModifierKey): void
    removed(key: ModifierKey): void
}

/**
 * A stat: a base value, and the modifiers applied to it in their order.
 *
 * @remarks
 * The modifiers are the shared implementations of each kind of value ({@link Add}, {@link Multiply},
 * {@link Clamp} for numbers) rather than functions written on the spot. Each has its order set once, so
 * two items changing the same stat always combine the same way. The value is cached, and computed again
 * when the base or a modifier changes.
 */
export class Attribute<T> {


    constructor(base: T){
        this.#base = base
        this.#value = base
    }


    /** The value before any modifier. */
    public get base(): T { return this.#base }

    public set base(base: T){
        this.#base = base
        this.#stale = true
    }

    /** The base, through each modifier by increasing order. */
    public get value(): T {
        if(this.#stale) this.#value = this.#compute()
        return this.#value
    }

    /** What hears of the modifiers added and taken back, none by default: the battle the stat is in. */
    public watcher: AttributeWatcher|null = null

    /** Add a modifier under a key, in place of the one the key already held. */
    public add(key: ModifierKey, modifier: Modifier<T>): void {
        this.#modifiers.set(key, modifier)
        this.#stale = true
        this.watcher?.added(key)
    }

    /** Take back the modifier of a key. Taking back a key with none does nothing. */
    public remove(key: ModifierKey): void {
        if(!this.#modifiers.delete(key)) return
        this.#stale = true
        this.watcher?.removed(key)
    }

    /** Does a key hold a modifier here? */
    public has(key: ModifierKey): boolean {
        return this.#modifiers.has(key)
    }

    /** Its value, then its base when the modifiers change it: `6 (base 4)`. */
    public toString(): string {
        const value = this.value
        return value === this.#base ? valueText(value) : `${valueText(value)} (base ${valueText(this.#base)})`
    }


    #base: T
    #value: T
    #stale = false
    readonly #modifiers = new Map<ModifierKey, Modifier<T>>()

    #compute(): T {
        // A stable sort, so two modifiers of the same order apply in the order they were added.
        const sorted = [...this.#modifiers.values()].sort((a, b) => a.order - b.order)
        let value = this.#base
        for(const modifier of sorted) value = modifier.apply(value)
        this.#stale = false
        return value
    }
}


/** A value of an attribute: a number rounded, a yes or no, anything else as it writes itself. */
function valueText(value: unknown): string {
    if(typeof value === "number") return numberText(value)
    if(typeof value === "boolean") return flagText(value)
    return String(value)
}


//// The modifiers of numbers ////

/** When an {@link Add} applies. */
export const ADD_ORDER = 100

/** When a {@link Multiply} applies, after the additions. */
export const MULTIPLY_ORDER = 200

/** When a {@link Clamp} applies, last. */
export const CLAMP_ORDER = 300

/** When a {@link Forced} applies, after everything else. */
export const FORCED_ORDER = 400

/** A number added to the value. */
export class Add implements Modifier<number> {


    public readonly order = ADD_ORDER

    constructor(
        /** What is added, negative to take away. */
        public readonly amount: number,
    ){}


    public apply(value: number): number {
        return value + this.amount
    }
}

/** The value multiplied by a factor. */
export class Multiply implements Modifier<number> {


    public readonly order = MULTIPLY_ORDER

    constructor(
        /** The factor, 0 to cancel the value. */
        public readonly factor: number,
    ){}


    public apply(value: number): number {
        return value * this.factor
    }
}

/** The value kept between two bounds. */
export class Clamp implements Modifier<number> {


    public readonly order = CLAMP_ORDER

    constructor(
        public readonly min: number,
        public readonly max: number,
    ){}


    public apply(value: number): number {
        return Math.min(this.max, Math.max(this.min, value))
    }
}


//// The modifiers of any value ////

/** The value replaced, whatever it was. */
export class Forced<T> implements Modifier<T> {


    public readonly order = FORCED_ORDER

    constructor(
        /** What the value becomes. */
        public readonly forced: T,
    ){}


    public apply(): T {
        return this.forced
    }
}
