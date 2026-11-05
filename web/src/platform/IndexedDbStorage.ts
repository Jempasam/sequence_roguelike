import type { PlayerStorage, StoragePort } from "@game/core"

/** The Web Lock every tab of the game asks for, so only one of them reaches the saves. */
const LOCK_NAME = "roguelike-saves"

/** The database the saves are kept in, and its version. */
const DATABASE_NAME = "roguelike"
const DATABASE_VERSION = 1

/** The object store of the database, from a key to its bytes. */
const STORE = "saves"

/**
 * Keeps the data of the player in IndexedDB. `localStorage` is out: 5 MB at most, strings only, and
 * synchronous calls.
 *
 * @remarks
 * The lock is a Web Lock, held while the promise its callback returns is pending, and given back by the
 * browser itself when the tab closes. The Web Locks API needs a secure context: HTTPS, or `localhost` in
 * dev.
 */
export class IndexedDbStorage implements StoragePort {


    constructor(
        /** The IndexedDB of the page. */
        public readonly indexedDB: IDBFactory,

        /** The Web Locks of the page, shared by its tabs. */
        public readonly locks: LockManager,

        /**
         * Asks the browser to keep the saves when the disk runs short, and tells whether it agreed.
         * Without it, the browser may clear them. A refusal does not prevent playing.
         */
        public readonly persist: () => Promise<boolean>,
    ){}


    public async open(): Promise<PlayerStorage|null> {
        const release = await this.#lock()
        if(!release) return null
        let database: IDBDatabase
        try {
            database = await this.#openDatabase()
        } catch(error){
            release()
            throw error
        }
        // Not awaited: Firefox asks the player, and the game does not wait for the answer to start.
        this.persist().then(
            granted => { if(!granted) console.warn("The browser may clear the saves: it did not agree to persist them.") },
            error => console.warn("The browser may clear the saves: asking it to persist them failed.", error),
        )
        return new IndexedDbPlayerStorage(database, release)
    }


    /** Take the lock of the saves, and the way to give it back: none when another tab holds it. */
    #lock(): Promise<(() => void)|null> {
        return new Promise((resolve, reject) => {
            this.locks.request(LOCK_NAME, { ifAvailable: true }, lock => {
                if(!lock){
                    resolve(null)
                    return
                }
                // Held until this promise resolves, which only the returned function does.
                return new Promise<void>(release => resolve(() => release()))
            }).catch(reject)
        })
    }

    #openDatabase(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
            const request = this.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
            request.onupgradeneeded = () => request.result.createObjectStore(STORE)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
            request.onblocked = () => reject(new Error(`The database ${DATABASE_NAME} is held open at an older version.`))
        })
    }
}

/** One session of an {@link IndexedDbStorage}, between `open` and `close`. */
class IndexedDbPlayerStorage implements PlayerStorage {


    readonly #database: IDBDatabase
    readonly #release: () => void
    #closed = false

    constructor(database: IDBDatabase, release: () => void){
        this.#database = database
        this.#release = release
    }


    public async read(key: string): Promise<Uint8Array|null> {
        this.#checkOpen()
        const transaction = this.#database.transaction(STORE, "readonly")
        const value = await resultOf(transaction.objectStore(STORE).get(key))
        if(value === undefined) return null
        if(!(value instanceof Uint8Array)) throw new Error(`The save "${key}" is not stored as bytes.`)
        return value
    }

    public async write(key: string, data: Uint8Array): Promise<void> {
        this.#checkOpen()
        // Strict, since Chrome is relaxed by default and would report the write before it reaches the disk.
        const transaction = this.#database.transaction(STORE, "readwrite", { durability: "strict" })
        // A copy, since the structured clone of a view keeps its whole buffer, and the caller may change it.
        transaction.objectStore(STORE).put(data.slice(), key)
        await completionOf(transaction)
    }

    public async remove(key: string): Promise<void> {
        this.#checkOpen()
        const transaction = this.#database.transaction(STORE, "readwrite", { durability: "strict" })
        transaction.objectStore(STORE).delete(key)
        await completionOf(transaction)
    }

    public async close(): Promise<void> {
        this.#checkOpen()
        this.#closed = true
        this.#database.close()
        this.#release()
    }


    #checkOpen(): void {
        if(this.#closed) throw new Error("This PlayerStorage is closed. Open the StoragePort again.")
    }
}

function resultOf<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

/**
 * Settles once a transaction is committed. The success of its request is not enough: only `complete`
 * says the data is committed.
 */
function completionOf(transaction: IDBTransaction): Promise<void> {
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () => reject(transaction.error ?? new Error("The transaction was aborted."))
    })
}
