import type { Command, CommandContext } from "./Command"

/**
 * An argument of a command: what its word may be, and how it is read.
 *
 * @typeParam C - What the command runs with.
 * @typeParam T - What the word is read into.
 */
export interface Arg<C, T> {
    /**
     * What the word may be, offered as it is typed.
     *
     * @param before - What the arguments before it were read into, so an argument offers what fits them:
     * the cards of the hand of the unit typed.
     */
    complete(ctx: C, before: readonly unknown[]): string[]

    /**
     * Read the word, none when it is not typed, or say why it cannot be.
     *
     * @param before - What the arguments before it were read into.
     */
    read(ctx: C, word: string|undefined, before: readonly unknown[]): T|Error
}

/** What each argument of a list is read into, in order. */
export type ValuesOf<Args extends readonly Arg<never, unknown>[]> = {
    -readonly [K in keyof Args]: Args[K] extends Arg<never, infer T> ? T : never
}

/**
 * A command reading its arguments one word each, in order, then running with what they were read into.
 *
 * @param args - Each argument, in the order typed. An {@link optional} one goes after the others.
 */
export function command<C extends CommandContext, const Args extends readonly Arg<C, unknown>[]>(
    usage: string, args: Args, run: (ctx: C, ...values: ValuesOf<Args>) => void,
): Command<C, ValuesOf<Args>> {
    type A = ValuesOf<Args>
    const each: readonly Arg<C, unknown>[] = args
    /** What the words read into, the first ones only, or why one cannot be. */
    const read = (ctx: C, words: readonly (string|undefined)[]): unknown[]|Error => {
        const values: unknown[] = []
        for(const [index, word] of words.entries()){
            const value = each[index].read(ctx, word, values)
            if(value instanceof Error) return value
            values.push(value)
        }
        return values
    }
    return {
        usage,
        complete: (ctx, typed) => {
            const arg = each[typed.length - 1]
            const before = read(ctx, typed.slice(0, -1))
            return arg && !(before instanceof Error) ? arg.complete(ctx, before) : []
        },
        parse: (ctx, words) => {
            if(words.length > each.length) return new Error("Trop d'arguments.")
            return read(ctx, each.map((_, index) => words[index])) as A|Error
        },
        execute: (ctx, values) => run(ctx, ...values),
    }
}

/** What a {@link group} read: the sub-command typed, and what it read. */
export interface GroupParsed<C extends CommandContext> {
    readonly command: Command<C, unknown>
    readonly parsed: unknown
}

/**
 * A command made of sub-commands, typed after its name: `hand add <unit> <card>`. Its usage lists them,
 * and its details hold the usage of each.
 *
 * @param name - The name it is registered under, for its usage.
 * @param commands - Each sub-command, by the word it is typed with. Their usage starts with the whole line:
 * `"hand add <unit> <card> : ..."`.
 */
export function group<C extends CommandContext>(
    name: string, summary: string, commands: Readonly<Record<string, Command<C, unknown>>>,
): Command<C, GroupParsed<C>> {
    const table = new Map(Object.entries(commands))
    const words = [...table.keys()]
    return {
        usage: `${name} <${words.join("|")}> : ${summary}`,
        details: [...table.values()].map(command => command.usage),
        complete: (ctx, args) => {
            if(args.length <= 1) return words
            return table.get(args[0].toLowerCase())?.complete(ctx, args.slice(1)) ?? []
        },
        parse: (ctx, args) => {
            if(!args[0]) return new Error(`Il manque la sous-commande : ${words.join(", ")}.`)
            const command = table.get(args[0].toLowerCase())
            if(!command) return new Error(`Pas de sous-commande « ${args[0]} » : ${words.join(", ")}.`)
            const parsed = command.parse(ctx, args.slice(1))
            return parsed instanceof Error ? parsed : { command, parsed }
        },
        execute: (ctx, { command, parsed }) => command.execute(ctx, parsed),
    }
}


//// Arguments of any game ////

/** An argument that may be left out, the last ones only: it is then a fallback. */
export function optional<C, T, F>(arg: Arg<C, T>, fallback: F): Arg<C, T|F> {
    return {
        complete: arg.complete,
        read: (ctx, word, before) => word === undefined ? fallback : arg.read(ctx, word, before),
    }
}

/**
 * A whole number, at least a minimum.
 *
 * @param what - What it stands for, for the errors: `"les cœurs"`.
 */
export function whole<C>(what: string, min: number): Arg<C, number> {
    return {
        complete: () => [],
        read: (_, word) => {
            const value = Number(word)
            if(word === undefined || !Number.isInteger(value) || value < min){
                return new Error(`${capitalized(what)} : un nombre entier, ${min} au moins.`)
            }
            return value
        },
    }
}

/**
 * One of the things a list holds, typed by its word, whatever the case.
 *
 * @param what - What it stands for, for the errors: `"l'unité"`.
 * @param itemsOf - What it may be, read at each word: the units living now.
 * @param wordOf - The word a thing is typed as, with no space.
 */
export function named<C, T>(
    what: string, itemsOf: (ctx: C, before: readonly unknown[]) => readonly T[], wordOf: (item: T) => string,
): Arg<C, T> {
    return {
        complete: (ctx, before) => itemsOf(ctx, before).map(wordOf),
        read: (ctx, word, before) => {
            if(word === undefined) return new Error(`Il manque ${what}.`)
            const lower = word.toLowerCase()
            const item = itemsOf(ctx, before).find(candidate => wordOf(candidate).toLowerCase() === lower)
            return item ?? new Error(`${capitalized(what)} « ${word} » n'existe pas.`)
        },
    }
}

/** The text with its first letter in capital. */
function capitalized(text: string): string {
    return text.charAt(0).toUpperCase() + text.slice(1)
}
