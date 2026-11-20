import { UnreadableFault } from "../faults"
import { readJson, wrongShape } from "../read"
import { PROGRESS_TOPIC } from "../modes/duelRace/topics"

/** Where a player stands on its journey, as the others are told of it. */
export interface Progress {
    /** The level of the floor. */
    readonly floor: number

    /** How many places it went to. */
    readonly depth: number

    /** The row of the map it stands on, none before the first place. */
    readonly layer: number

    /** How many rows the map of the floor has, the one of the exits left out: 0 when it is not known. */
    readonly rows: number

    /** Does it wait at a halt of the duels? */
    readonly atDuel: boolean

    /** Is it at a fight? */
    readonly inBattle: boolean

    /** Is it visiting a halt? */
    readonly inHalt: boolean
}

/** A message as sent. */
export function writeProgressMessage(progress: Progress): string {
    return JSON.stringify(progress)
}

/** A message as received, or why it cannot be read. */
export function readProgressMessage(text: string): Progress|UnreadableFault {
    const message = readJson(PROGRESS_TOPIC.name, text) as Partial<Progress>|null|UnreadableFault
    if(message instanceof UnreadableFault) return message
    const isProgress = typeof message === "object" && message !== null
        && typeof message.floor === "number" && typeof message.depth === "number"
        && typeof message.layer === "number" && typeof message.atDuel === "boolean"
        && typeof message.inBattle === "boolean" && typeof message.inHalt === "boolean"
    if(!isProgress) return wrongShape(PROGRESS_TOPIC.name, text, "message of a progress")
    // A peer that does not tell the rows of its map is read as not knowing them.
    const rows = typeof message.rows === "number" ? message.rows : 0
    return { ...message, rows } as Progress
}
