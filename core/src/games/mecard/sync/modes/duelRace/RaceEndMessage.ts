import { UnreadableFault } from "../../faults"
import { readJson, wrongShape } from "../../read"
import { RACE_END_TOPIC } from "./topics"

/** What the hub tells everyone when the race is over. */
export interface RaceEndMessage {
    /** The player that won, none when nobody did. */
    readonly winner: string|null
}

/** A message as sent. */
export function writeRaceEndMessage(message: RaceEndMessage): string {
    return JSON.stringify(message)
}

/** A message as received, or why it cannot be read. */
export function readRaceEndMessage(text: string): RaceEndMessage|UnreadableFault {
    const message = readJson(RACE_END_TOPIC.name, text) as Partial<RaceEndMessage>|null|UnreadableFault
    if(message instanceof UnreadableFault) return message
    const winner = typeof message === "object" && message !== null ? message.winner : undefined
    if(winner !== null && typeof winner !== "string") return wrongShape(RACE_END_TOPIC.name, text, "end of the race")
    return { winner }
}
