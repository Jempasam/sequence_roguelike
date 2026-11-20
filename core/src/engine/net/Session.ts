import type { JsonValue } from "@game/server/protocol"

/** The version of what clients and hosts say to each other about sessions: another one is refused. */
export const SESSION_VERSION = 1

/**
 * What a client says of itself when it joins a room, and says again when it comes back: it picks the id and
 * the secret itself, so there is no handshake. The id tells the client from the others for as long as the
 * session lives, and the secret keeps another client from taking it over.
 */
export interface SessionInfo {
    readonly id: string
    readonly secret: string

    /** The version of the sessions it speaks. */
    readonly version: number
}

/** A session as the `data` of a member of a room, which is where the host reads it. */
export function writeSession(info: SessionInfo): JsonValue {
    return { session: { id: info.id, secret: info.secret, version: info.version } }
}

/** The session in the `data` of a member, none when it says none, or in another shape. */
export function readSession(data: JsonValue|undefined): SessionInfo|null {
    if(typeof data !== "object" || data === null || Array.isArray(data)) return null
    const session = (data as { readonly [key: string]: JsonValue }).session
    if(typeof session !== "object" || session === null || Array.isArray(session)) return null
    const { id, secret, version } = session as { readonly [key: string]: JsonValue }
    if(typeof id !== "string" || typeof secret !== "string" || typeof version !== "number") return null
    return { id, secret, version }
}

/** What a client draws a session from: bytes it cannot have guessed. */
export type RandomText = (length: number) => string

/**
 * Random text from the cryptographic source of the environment when there is one, from `Math.random` when
 * there is not.
 */
export const RANDOM_TEXT: RandomText = length => {
    const source = (globalThis as { crypto?: { getRandomValues(array: Uint8Array): Uint8Array } }).crypto
    const bytes = new Uint8Array(length)
    if(source) source.getRandomValues(bytes)
    else for(let index = 0; index < length; index++) bytes[index] = Math.floor(Math.random() * 256)
    return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("")
}
