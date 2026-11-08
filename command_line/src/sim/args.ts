import { closest, UsageError } from "./errors"

/** What an option takes. */
export interface OptionSpec {
    readonly name: string

    /** A flag takes no value. */
    readonly flag?: boolean

    /** May it be given several times, its values kept in order? */
    readonly repeatable?: boolean
}

/** The options read: the last value of each, every value of a repeatable one, the flags set. */
export interface ParsedArgs {
    readonly values: ReadonlyMap<string, readonly string[]>
}

/**
 * Read `--name value`, `--name=value` and the flags, checked against the options known.
 *
 * @throws {@link UsageError} On an unknown option, a missing value, an option given twice that is not
 * repeatable, or a word that is no option.
 */
export function parseArgs(args: readonly string[], specs: readonly OptionSpec[]): ParsedArgs {
    const values = new Map<string, string[]>()
    for(let index = 0; index < args.length; index++){
        const arg = args[index]
        if(!arg.startsWith("--")) throw new UsageError(`Argument inattendu « ${arg} » : toutes les options commencent par --.`)
        const equals = arg.indexOf("=")
        const name = arg.slice(2, equals < 0 ? undefined : equals)
        const spec = specs.find(candidate => candidate.name === name)
        if(spec === undefined){
            const near = closest(name, specs.map(each => each.name), 1)
            const hint = near.length > 0 ? `, vouliez-vous --${near[0]} ?` : " (--help liste les options)."
            throw new UsageError(`Option inconnue --${name}${hint}`)
        }
        let value: string
        if(spec.flag){
            if(equals >= 0) throw new UsageError(`--${name} ne prend pas de valeur.`)
            value = "true"
        }
        else if(equals >= 0) value = arg.slice(equals + 1)
        else {
            const next = args[index + 1]
            if(next === undefined || next.startsWith("--")) throw new UsageError(`--${name} attend une valeur.`)
            value = next
            index++
        }
        const known = values.get(name)
        if(known !== undefined && !spec.repeatable) throw new UsageError(`--${name} est donné deux fois.`)
        if(known === undefined) values.set(name, [value])
        else known.push(value)
    }
    return { values }
}

/** The last value of an option, none when it was not given. */
export function valueOf(parsed: ParsedArgs, name: string): string|undefined {
    return parsed.values.get(name)?.at(-1)
}

/** Every value of a repeatable option. */
export function valuesOf(parsed: ParsedArgs, name: string): readonly string[] {
    return parsed.values.get(name) ?? []
}

/** Is a flag set? */
export function isSet(parsed: ParsedArgs, name: string): boolean {
    return parsed.values.has(name)
}

/** A list: values separated by commas, none empty. */
export function listOf(text: string, option: string): string[] {
    const items = text.split(",").map(item => item.trim())
    if(items.some(item => item === "")) throw new UsageError(`${option} : liste invalide « ${text} » (valeur vide).`)
    return items
}

/** A whole number from `min`, for an option. */
export function integerOf(text: string, option: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
    if(!/^-?\d+$/.test(text.trim())) throw new UsageError(`${option} : entier attendu, reçu « ${text} ».`)
    const value = Number(text)
    if(value < min || value > max){
        const range = max === Number.MAX_SAFE_INTEGER ? `≥ ${min}` : `entre ${min} et ${max}`
        throw new UsageError(`${option} : ${value} hors limites (entier ${range} attendu).`)
    }
    return value
}

/** One word among a list, for an option. */
export function choiceOf<T extends string>(text: string, option: string, choices: readonly T[]): T {
    const found = choices.find(choice => choice === text)
    if(found === undefined) throw new UsageError(`${option} : « ${text} » invalide. Valeurs permises : ${choices.join(", ")}.`)
    return found
}
