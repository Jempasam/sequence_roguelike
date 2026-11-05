import type { NetError } from "./NetError"

/**
 * The channel a message goes by:
 * - `"reliable"`: every message arrives, in order. For events that must not be lost: a join, a chat line,
 *   the state of a battle.
 * - `"unreliable"`: a message may be lost or come out of order, and a lost one never holds back the next.
 *   For what the next message replaces anyway: inputs, positions.
 */
export type ChannelKind = "reliable"|"unreliable"

/** Where a connection stands: opening, open, or closed for good. */
export type ConnectionState = "connecting"|"open"|"closed"

/**
 * A two-way link to one other end carrying text messages, whatever carries them: a WebSocket to a server,
 * a WebRTC connection to a peer, or memory within the program.
 *
 * @remarks
 * A connection that closes never opens again: a new one is made instead. Messages sent before it opens,
 * or after it closed, are refused, since they would otherwise vanish without a word.
 */
export interface Connection {
    readonly state: ConnectionState

    /** Settles once the connection is open, or fails with a {@link NetError} when it never opens. */
    readonly opened: Promise<void>

    /**
     * Send a message to the other end.
     *
     * @param channel - The channel to send it by, reliable by default.
     * @throws {@link Error} When the connection is not open.
     */
    send(message: string, channel?: ChannelKind): void

    /** Hear each message from the other end, until the returned handle is disposed. */
    listen(handler: (message: string, channel: ChannelKind) => void): { dispose(): void }

    /** Be told once the connection closes, until the returned handle is disposed. */
    onClose(handler: (reason: NetError) => void): { dispose(): void }

    /** Close the connection. Closing twice does nothing. */
    close(): void
}
