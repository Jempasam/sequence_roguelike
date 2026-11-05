/**
 * The data of the player: settings, progression, the run in progress. Read and written only through
 * {@link PlayerStorage}, which exists once the lock is taken, so a second instance of the game cannot
 * overwrite the saves of the first.
 */
export interface StoragePort {
    /** Take this player's storage for the whole session, none when another instance of the game holds it. */
    open(): Promise<PlayerStorage|null>
}

/**
 * The storage of the player, held by this instance of the game until {@link PlayerStorage.close}.
 *
 * @remarks
 * Keys are constants of the game, already checked by `engine/save`: an adapter turns them into a file
 * name or a database key without any other precaution. There is no listing, since the game never has to
 * enumerate what exists.
 */
export interface PlayerStorage {
    /** The value of a key, none when the key was never written, or was removed. */
    read(key: string): Promise<Uint8Array|null>

    /**
     * Write the value of a key. Atomic: after a crash, the key holds either its old value or the new one,
     * never a mix of both. Changing `data` once the call is made does not change what is written.
     */
    write(key: string, data: Uint8Array): Promise<void>

    /** Remove a key. Removing a key that does not exist does nothing. */
    remove(key: string): Promise<void>

    /** Give the storage back to the next instance of the game. Every later call rejects. */
    close(): Promise<void>
}
