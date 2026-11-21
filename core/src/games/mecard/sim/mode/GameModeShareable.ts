import type { GameMember } from "./GameMember"

/**
 * Everything that crosses the API of a mode: JSON, and members. No Map, Set, Date, undefined, NaN, cycle,
 * function or class instance, since it would not go through a network the same way it goes through a call.
 *
 * @remarks
 * A member is sent as its id and given back as the member of that id: one that left in the meantime is still
 * given, though no more listed by the context.
 */
export type GameModeShareable =
    | null
    | boolean
    | number
    | string
    | readonly GameModeShareable[]
    | { readonly [key: string]: GameModeShareable }
    | GameMember

/** The key a member goes by in the text of a shareable. */
const MEMBER_KEY = "$member"

/** Is it a member, as the API gives them? */
export function isGameMember(value: unknown): value is GameMember {
    if(typeof value !== "object" || value === null || Array.isArray(value)) return false
    const { id, name, connected, options } = value as Partial<Record<keyof GameMember, unknown>>
    return typeof id === "string" && typeof name === "string" && typeof connected === "boolean"
        && typeof options === "object" && options !== null
}

/** The text of a shareable: the members are told by their id. */
export function shareableToJson(value: GameModeShareable|undefined): string {
    return JSON.stringify(value === undefined ? null : value, (_key, each: unknown) => {
        if(typeof each === "number" && !Number.isFinite(each)) return null
        return isGameMember(each) ? { [MEMBER_KEY]: each.id } : each
    })
}

/**
 * A shareable from its text: each member is given as the one `memberOf` tells of its id. Text that is not a
 * shareable makes `null`, which the caller tells from a missing value by its context.
 */
export function shareableFromJson(text: string, memberOf: (id: string) => GameMember): GameModeShareable {
    let parsed: unknown
    try {
        parsed = JSON.parse(text, (_key, each: unknown) => {
            if(typeof each !== "object" || each === null || Array.isArray(each)) return each
            const keys = Object.keys(each)
            if(keys.length === 1 && keys[0] === MEMBER_KEY){
                const id = (each as Record<string, unknown>)[MEMBER_KEY]
                if(typeof id === "string") return memberOf(id)
            }
            return each
        })
    } catch {
        return null
    }
    return parsed as GameModeShareable
}

/**
 * What a value becomes by going through the API: the same shape a network would give, and the same for a
 * direct call. Local calls pass every value through it, so a mode never shares anything else.
 */
export function shareable<T extends GameModeShareable|undefined>(
    value: T, memberOf: (id: string) => GameMember,
): GameModeShareable {
    return shareableFromJson(shareableToJson(value), memberOf)
}

/** A shareable as a JSON value, ready to be written in a message: the members are told by their id. */
export function encodeShareable(value: GameModeShareable|undefined): unknown {
    return JSON.parse(shareableToJson(value))
}

/** A shareable from the JSON value of a message: each member is the one `memberOf` tells of its id. */
export function decodeShareable(value: unknown, memberOf: (id: string) => GameMember): GameModeShareable {
    return shareableFromJson(JSON.stringify(value ?? null), memberOf)
}
