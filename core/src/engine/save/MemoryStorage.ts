import type { PlayerStorage, StoragePort } from "../../platform"

/**
 * The storage of the player, held in memory, so the saves and the game are tested without a disk or a
 * browser. It is a real implementation of the port, lock included: a second `open` gets none until the
 * first storage is closed.
 */
export class MemoryStorage implements StoragePort {


    /** The value of each key, kept across the sessions of this storage. */
    readonly #values = new Map<string, Uint8Array>()
    #held = false

    public async open(): Promise<PlayerStorage|null> {
        if(this.#held) return null
        this.#held = true
        return new MemoryPlayerStorage(this.#values, () => { this.#held = false })
    }
}

/** One session of a {@link MemoryStorage}, between `open` and `close`. */
class MemoryPlayerStorage implements PlayerStorage {


    readonly #values: Map<string, Uint8Array>
    readonly #release: () => void
    #closed = false

    constructor(values: Map<string, Uint8Array>, release: () => void){
        this.#values = values
        this.#release = release
    }


    public async read(key: string): Promise<Uint8Array|null> {
        this.#checkOpen()
        return this.#values.get(key)?.slice() ?? null
    }

    public async write(key: string, data: Uint8Array): Promise<void> {
        this.#checkOpen()
        this.#values.set(key, data.slice())
    }

    public async remove(key: string): Promise<void> {
        this.#checkOpen()
        this.#values.delete(key)
    }

    public async close(): Promise<void> {
        this.#checkOpen()
        this.#closed = true
        this.#release()
    }


    #checkOpen(): void {
        if(this.#closed) throw new Error("This PlayerStorage is closed. Open the StoragePort again.")
    }
}
