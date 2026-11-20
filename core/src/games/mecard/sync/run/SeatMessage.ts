import { SEAT_TOPIC } from "../SyncChannel"
import { UnreadableFault } from "../faults"
import { readJson, wrongShape } from "../read"

/** What a host tells a client it plays, in place of what it told before. */
export interface SeatMessage {
    /** The units it plays, by their names, none for a client that only watches. */
    readonly units: readonly string[]
}

/** A message as sent. */
export function writeSeatMessage(message: SeatMessage): string {
    return JSON.stringify(message)
}

/** A message as received, or why it cannot be read. */
export function readSeatMessage(text: string): SeatMessage|UnreadableFault {
    const message = readJson(SEAT_TOPIC.name, text) as Partial<SeatMessage>|null|UnreadableFault
    if(message instanceof UnreadableFault) return message
    const isMessage = typeof message === "object" && message !== null && Array.isArray(message.units)
    if(!isMessage) return wrongShape(SEAT_TOPIC.name, text, "message of the seats")
    return message as SeatMessage
}
