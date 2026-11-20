import { PROFILE_REFUSED_TOPIC, PROFILE_TOPIC, ROSTER_SELF_TOPIC, ROSTER_TOPIC } from "../SyncChannel"
import { UnreadableFault } from "../faults"
import { readJson, wrongShape } from "../read"

/** What a client says of itself when it comes into a lobby: the name it asks for, and the version it speaks. */
export interface ProfileMessage {
    readonly version: number
    readonly name: string
}

/** Someone in the lobby, as everyone is told. */
export interface RosterEntry {
    /** What tells them from the others: the id of their session, `host` for the host. */
    readonly id: string
    readonly name: string

    /** Is their connection lost, and may it come back? */
    readonly lost: boolean
}

/** Who is in the lobby, in the order they came, the host first. */
export interface RosterMessage {
    readonly members: readonly RosterEntry[]
}

/** What a client is told of itself: the id the others know it by, and the name it was given. */
export interface SelfMessage {
    readonly id: string
    readonly name: string
}

/** What a client turned away is told: the version of the lobby it is turned away by. */
export interface RefusedMessage {
    readonly ours: number
}

export function writeProfileMessage(message: ProfileMessage): string {
    return JSON.stringify(message)
}

export function writeRosterMessage(message: RosterMessage): string {
    return JSON.stringify(message)
}

export function writeSelfMessage(message: SelfMessage): string {
    return JSON.stringify(message)
}

export function writeRefusedMessage(message: RefusedMessage): string {
    return JSON.stringify(message)
}

/** The fields of a text that is a JSON object, or why it is not. */
function objectOf(topic: string, text: string, what: string): Record<string, unknown>|UnreadableFault {
    const read = readJson(topic, text)
    if(read instanceof UnreadableFault) return read
    if(typeof read !== "object" || read === null || Array.isArray(read)) return wrongShape(topic, text, what)
    return read as Record<string, unknown>
}

export function readProfileMessage(text: string): ProfileMessage|UnreadableFault {
    const read = objectOf(PROFILE_TOPIC.name, text, "profile")
    if(read instanceof UnreadableFault) return read
    if(typeof read.version !== "number" || typeof read.name !== "string"){
        return wrongShape(PROFILE_TOPIC.name, text, "profile")
    }
    return { version: read.version, name: read.name }
}

export function readRosterMessage(text: string): RosterMessage|UnreadableFault {
    const read = objectOf(ROSTER_TOPIC.name, text, "roster")
    if(read instanceof UnreadableFault) return read
    const { members } = read
    const isEntry = (entry: unknown): entry is RosterEntry => {
        if(typeof entry !== "object" || entry === null) return false
        const { id, name, lost } = entry as Record<string, unknown>
        return typeof id === "string" && typeof name === "string" && typeof lost === "boolean"
    }
    if(!Array.isArray(members) || !members.every(isEntry)) return wrongShape(ROSTER_TOPIC.name, text, "roster")
    return { members: members.map(({ id, name, lost }) => ({ id, name, lost })) }
}

export function readSelfMessage(text: string): SelfMessage|UnreadableFault {
    const read = objectOf(ROSTER_SELF_TOPIC.name, text, "identity")
    if(read instanceof UnreadableFault) return read
    if(typeof read.id !== "string" || typeof read.name !== "string"){
        return wrongShape(ROSTER_SELF_TOPIC.name, text, "identity")
    }
    return { id: read.id, name: read.name }
}

export function readRefusedMessage(text: string): RefusedMessage|UnreadableFault {
    const read = objectOf(PROFILE_REFUSED_TOPIC.name, text, "refusal")
    if(read instanceof UnreadableFault) return read
    if(typeof read.ours !== "number") return wrongShape(PROFILE_REFUSED_TOPIC.name, text, "refusal")
    return { ours: read.ours }
}
