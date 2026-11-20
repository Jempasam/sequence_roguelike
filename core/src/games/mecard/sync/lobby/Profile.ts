import { HUE_TURN } from "../chat/ChatMessage"

/** The version of what the clients of a lobby say to each other: a client of another one is turned away. */
export const LOBBY_VERSION = 2

/** The longest name a player goes by. */
export const NAME_LENGTH = 16

/** The name of a player that gave none. */
export const DEFAULT_NAME = "Joueur"

/** The id the host goes by in the lobby, which no client has. */
export const HOST_ID = "host"

/** What is left of a name once it is fit to be shown: trimmed, on one line, not too long, never empty. */
export function cleanName(raw: string): string {
    const name = raw
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, NAME_LENGTH)
        .trim()
    return name === "" ? DEFAULT_NAME : name
}

/**
 * The name, or the name followed by the first number that makes it differ from every name taken, however it
 * is written in capitals.
 */
export function uniqueName(name: string, taken: readonly string[]): string {
    const used = new Set(taken.map(each => each.toLowerCase()))
    if(!used.has(name.toLowerCase())) return name
    for(let number = 2;; number++){
        const suffix = ` ${number}`
        const candidate = name.slice(0, Math.max(1, NAME_LENGTH - suffix.length)).trimEnd() + suffix
        if(!used.has(candidate.toLowerCase())) return candidate
    }
}

/** The hue a name always has, so a player is the same color to everyone. */
export function hueOfName(name: string): number {
    let hash = 0
    for(let index = 0; index < name.length; index++) hash = (Math.imul(hash, 31) + name.charCodeAt(index)) >>> 0
    return hash % HUE_TURN
}
