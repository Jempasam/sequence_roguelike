import type { Removable } from "../lifetime"
/** Is this client the one a game is played on, or one that only hears it? */
export type SyncRole = "main"|"viewer"

/** The way between this client and one other, in both directions. */
export interface SyncLink {
    /** Send a message to the other client. */
    send(message: string): void

    /** Hear each message of the other client, until the returned handle is disposed. */
    listen(handler: (message: string) => void): Removable
}

/**
 * A client connected to the main client. What is sent to it while its connection is lost is kept, up to a
 * limit, and given in order when the connection comes back, before the main client is told so by
 * {@link SyncRoom.onBack}; the oldest messages are lost beyond the limit. What it hears is heard on the same
 * link through every connection.
 */
export interface SyncPeer extends SyncLink {
    /** What tells it from the others, for as long as it stays, a lost connection included. */
    readonly id: string
}

/** The clients connected to the main client, each on its own link. */
export interface SyncRoom {
    /** Hear each client that connects, until the returned handle is disposed. */
    onJoin(handler: (peer: SyncPeer) => void): Removable

    /** Hear each client whose connection is lost and may come back, until the returned handle is disposed. */
    onLost(handler: (peer: SyncPeer) => void): Removable

    /**
     * Hear each client whose connection came back, until the returned handle is disposed. What was told to
     * every client connecting is to be told again to this one, which lost it.
     */
    onBack(handler: (peer: SyncPeer) => void): Removable

    /** Hear each client that left for good, until the returned handle is disposed. */
    onLeave(handler: (peer: SyncPeer) => void): Removable
}

/**
 * A channel between the clients of one game, carrying text messages: the main client sends, the viewers
 * listen. What carries them is the adapter's: a channel between tabs, a network.
 *
 * @remarks
 * A message sent reaches every viewer listening at that moment, none that comes later: a viewer connecting
 * hears its first messages instead. The order of the messages is kept, though a transport may drop some.
 *
 * A transport telling its clients apart also gives the main client a {@link SyncRoom}, and a viewer that came
 * to play a {@link SyncLink}, to speak to the main client.
 */
export interface SyncPort {
    readonly role: SyncRole

    /** The clients connected one by one, none on a viewer, or on a transport that cannot tell them apart. */
    readonly room: SyncRoom|null

    /** The way to the main client, none on the main client, and on a viewer that only watches. */
    readonly link: SyncLink|null

    /** Send a message to every viewer connected. */
    send(message: string): void

    /**
     * Give each viewer connecting a first message, read when it connects, none when there is nothing to tell
     * yet, until the returned handle is disposed. A viewer hears them in the order they were asked for.
     */
    onPeer(initial: () => string|null): Removable

    /** Hear each message, until the returned handle is disposed. */
    listen(handler: (message: string) => void): Removable
}
