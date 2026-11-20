import { PARTICIPATE_TOPIC, PARTICIPATION_TOPIC } from "../SyncChannel"
import { UnreadableFault } from "../faults"
import type { SettingValues } from "../lobby/Setting"
import { readJson, wrongShape } from "../read"

/** How a client takes part in a game: it plays, or it only watches. */
export type ParticipationRole = "player"|"spectator"

/** What a client says of its part in a game: that it takes it, or that it leaves it. */
export interface ParticipateMessage {
    readonly kind: "join"|"quit"

    /** The game it is about: a client of another game is not heard. */
    readonly game: number

    /** What it set for itself, by the id of each setting: for a `join`, none when it has nothing to set. */
    readonly options?: SettingValues
}

/** What the host tells a client of its part in a game. */
export interface ParticipationMessage {
    readonly game: number
    readonly role: ParticipationRole

    /** What the client holds in the game, as the mode names it: none for one that only watches. */
    readonly seat: string|null
}

export function writeParticipateMessage(message: ParticipateMessage): string {
    return JSON.stringify(message)
}

export function writeParticipationMessage(message: ParticipationMessage): string {
    return JSON.stringify(message)
}

function objectOf(topic: string, text: string, what: string): Record<string, unknown>|UnreadableFault {
    const read = readJson(topic, text)
    if(read instanceof UnreadableFault) return read
    if(typeof read !== "object" || read === null || Array.isArray(read)) return wrongShape(topic, text, what)
    return read as Record<string, unknown>
}

export function readParticipateMessage(text: string): ParticipateMessage|UnreadableFault {
    const read = objectOf(PARTICIPATE_TOPIC.name, text, "request to take part")
    if(read instanceof UnreadableFault) return read
    const { kind, game, options } = read
    if((kind !== "join" && kind !== "quit") || typeof game !== "number"){
        return wrongShape(PARTICIPATE_TOPIC.name, text, "request to take part")
    }
    if(options === undefined) return { kind, game }
    const isValues = typeof options === "object" && options !== null && !Array.isArray(options)
        && Object.values(options).every(value => typeof value === "string" || typeof value === "number")
    if(!isValues) return wrongShape(PARTICIPATE_TOPIC.name, text, "request to take part")
    return { kind, game, options: options as SettingValues }
}

export function readParticipationMessage(text: string): ParticipationMessage|UnreadableFault {
    const read = objectOf(PARTICIPATION_TOPIC.name, text, "part in a game")
    if(read instanceof UnreadableFault) return read
    const { game, role, seat } = read
    if(typeof game !== "number" || (role !== "player" && role !== "spectator")){
        return wrongShape(PARTICIPATION_TOPIC.name, text, "part in a game")
    }
    if(seat !== null && typeof seat !== "string") return wrongShape(PARTICIPATION_TOPIC.name, text, "part in a game")
    return { game, role, seat }
}
