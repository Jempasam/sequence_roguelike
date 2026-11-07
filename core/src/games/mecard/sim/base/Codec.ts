/**
 * How a kind of value is written down as text and read back. A value never knows its codec: the codecs of a
 * {@link Codecs} are asked in turn which one writes it.
 */
export interface Codec<T> {
    /** What starts the text of every value this codec writes, naming it: unique among its {@link Codecs}. */
    readonly prefix: string

    /** Does this codec write that value? */
    is(value: T): boolean

    /** The value, as text: what {@link Codec.parse} reads back. */
    serialize(value: T): string

    /**
     * The value that text stands for.
     *
     * @throws {@link Error} For a text this codec did not write: a save of another version, or a corrupted
     * one.
     */
    parse(text: string): T
}

/** The codecs of one kind of value, which write a value as `prefix:text` and read it back by that prefix. */
export class Codecs<T> {


    constructor(
        /** What the values are, for the error of one that cannot be written or read. */
        public readonly kind: string,

        /** Asked in turn when writing: the first to write a value wins, a precise one before a broad one. */
        codecs: readonly Codec<T>[],
    ){
        for(const codec of codecs){
            if(this.#byPrefix.has(codec.prefix)) throw new Error(`Two ${kind} codecs are named "${codec.prefix}".`)
            this.#byPrefix.set(codec.prefix, codec)
        }
        this.#codecs = [...codecs]
    }


    /** The prefixes of its codecs, in the order they are asked. */
    public get prefixes(): string[] { return this.#codecs.map(codec => codec.prefix) }

    /**
     * A value, written down.
     *
     * @throws {@link Error} For a value none of the codecs writes.
     */
    public save(value: T): string {
        const codec = this.#codecs.find(each => each.is(value))
        if(!codec) throw new Error(`${String(value)} is not a ${this.kind} that can be saved.`)
        return `${codec.prefix}:${codec.serialize(value)}`
    }

    /**
     * A value, read back from what {@link Codecs.save} wrote.
     *
     * @throws {@link Error} For a text of no codec: a save of another version, or a corrupted one.
     */
    public load(saved: string): T {
        const at = saved.indexOf(":")
        const codec = at < 0 ? undefined : this.#byPrefix.get(saved.slice(0, at))
        if(!codec) throw new Error(`No ${this.kind} is written as "${saved}": the save comes from another version.`)
        return codec.parse(saved.slice(at + 1))
    }


    readonly #codecs: readonly Codec<T>[]
    readonly #byPrefix = new Map<string, Codec<T>>()
}

/**
 * The codec of values known by name: written as their name, read back by looking it up. A value is written
 * only if it is the one of its name.
 */
export function routeCodec<T extends { readonly name: string }>(
    prefix: string, values: readonly T[],
): Codec<T> {
    const byName = new Map(values.map(value => [value.name, value]))
    return {
        prefix,
        is: value => byName.get(value.name) === value,
        serialize: value => value.name,
        parse: name => {
            const value = byName.get(name)
            if(!value) throw new Error(`No ${prefix} is named "${name}": the save comes from another version.`)
            return value
        },
    }
}
