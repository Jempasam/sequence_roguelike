import { IDBFactory } from "fake-indexeddb"
import { describeStorageContract } from "@game/test/storageContract"

import { IndexedDbStorage } from "./IndexedDbStorage"

// --- Fixture builders ---

/**
 * The Web Locks of one browser, in memory, since Node has none. Only what IndexedDbStorage asks for: an
 * exclusive lock, taken only if available, and held while the callback's promise is pending.
 */
class MemoryLocks {


    readonly #held = new Set<string>()

    async request(name: string, _: LockOptions, callback: LockGrantedCallback<unknown>): Promise<unknown> {
        if(this.#held.has(name)) return callback(null)
        this.#held.add(name)
        try {
            return await callback({ name, mode: "exclusive" })
        } finally {
            this.#held.delete(name)
        }
    }
}

// --- Tests ---

describeStorageContract("IndexedDbStorage", () => new IndexedDbStorage(
    new IDBFactory(),
    new MemoryLocks() as unknown as LockManager,
    async() => true,
))
