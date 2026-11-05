/** Is this client the one a game is played on, or one that only watches it? */
export type SyncRole = "main"|"viewer"

/**
 * A channel between the clients of one game, carrying text messages: the main client sends, the viewers
 * listen. What carries them is the adapter's: a channel between tabs, a network.
 *
 * @remarks
 * A message sent reaches every viewer listening at that moment, none that comes later: a viewer waits for
 * the next one. The order of the messages is kept, though a transport may drop some.
 */
export interface SyncPort {
    readonly role: SyncRole

    /**
     * Send a message.
     *
     * @param retained - The name it stays under for a viewer to come, in place of the last of that name, none
     * for a message that only matters to those listening now. An adapter making viewers wait keeps nothing.
     */
    send(message: string, retained?: string): void

    /** Hear each message, until the returned handle is disposed. */
    listen(handler: (message: string) => void): { dispose(): void }
}
