/** What a host tells a client it plays, in place of what it told before. */
export interface SeatMessage {
    /** The units it plays, by their names, none for a client that only watches. */
    readonly units: readonly string[]
}

/** A message as sent. */
export function writeSeatMessage(message: SeatMessage): string {
    return JSON.stringify(message)
}

/**
 * A message as received.
 *
 * @throws {@link Error} When it is no message of a seat.
 */
export function readSeatMessage(text: string): SeatMessage {
    const message = JSON.parse(text) as Partial<SeatMessage>|null
    const isMessage = typeof message === "object" && message !== null && Array.isArray(message.units)
    if(!isMessage) throw new Error("A message of the seats came in another shape: is the host up to date?")
    return message as SeatMessage
}
