import { rmSync } from "node:fs"
import { mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { setTimeout as delay } from "node:timers/promises"
import type { PlayerStorage, StoragePort } from "@game/core"

/** The file that holds the PID of the instance holding the saves. */
const LOCK_FILE = "lock"

/** The extension of a save file, after its key. */
const SAVE_EXTENSION = ".sav"

/** The extension of a save being written, before it replaces the save. */
const TEMPORARY_EXTENSION = ".tmp"

/**
 * How many times a rename is tried again when Windows refuses it, and how long to wait in between, in
 * milliseconds. An antivirus or the indexer holding the file open for a moment makes it fail.
 */
const RENAME_RETRIES = 5
const RENAME_RETRY_DELAY = 50

/**
 * Keeps the data of the player in a folder, one `<key>.sav` file per key.
 *
 * @remarks
 * The lock is a file created exclusively, holding the PID of the instance. A lock whose process is dead
 * was left by a crash, and is taken over. Two instances started at the same moment after a crash may
 * both take it over: that needs a crash then a simultaneous double launch, and is accepted.
 */
export class FsStorage implements StoragePort {


    constructor(
        /** The folder of the saves, in the data folder of the user. */
        public readonly directory: string,
    ){}


    public async open(): Promise<PlayerStorage|null> {
        await mkdir(this.directory, { recursive: true })
        const lockFile = join(this.directory, LOCK_FILE)
        if(!await this.#lock(lockFile)) return null
        // Removes the lock when the process exits without closing the storage. Synchronous, since an exit
        // handler cannot wait.
        const onExit = () => rmSync(lockFile, { force: true })
        process.on("exit", onExit)
        return new FsPlayerStorage(this.directory, async() => {
            process.off("exit", onExit)
            await rm(lockFile, { force: true })
        })
    }


    /** Take the lock of the saves. Does it succeed? */
    async #lock(lockFile: string): Promise<boolean> {
        if(await createLock(lockFile)) return true
        const pid = await pidOf(lockFile)
        if(isAlive(pid)){
            // A reused PID makes a crashed instance look alive, so the path is given to remove it by hand.
            console.warn(`The saves are held by process ${pid}. If no other instance runs, delete ${lockFile}.`)
            return false
        }
        await rm(lockFile, { force: true })
        return createLock(lockFile)
    }
}

/** Create the lock file, holding this PID. Did it not exist yet? */
async function createLock(lockFile: string): Promise<boolean> {
    try {
        await writeFile(lockFile, String(process.pid), { flag: "wx" })
        return true
    } catch(error){
        if(codeOf(error) === "EEXIST") return false
        throw error
    }
}

/** The PID a lock file holds, none when its holder removed it since it could not be created. */
async function pidOf(lockFile: string): Promise<number|null> {
    try {
        return Number.parseInt(await readFile(lockFile, "utf8"), 10)
    } catch(error){
        if(codeOf(error) === "ENOENT") return null
        throw error
    }
}

/**
 * Does a process run with this PID? Signal 0 tests it without touching it. A PID that is not a number
 * comes from a lock file left empty by a crash between its creation and its write.
 */
function isAlive(pid: number|null): boolean {
    if(pid === null || !Number.isInteger(pid) || pid <= 0) return false
    try {
        process.kill(pid, 0)
        return true
    } catch(error){
        // EPERM: the process runs, under another user.
        return codeOf(error) !== "ESRCH"
    }
}

function codeOf(error: unknown): unknown {
    return error instanceof Error && "code" in error ? error.code : undefined
}

/** One session of an {@link FsStorage}, between `open` and `close`. */
class FsPlayerStorage implements PlayerStorage {


    readonly #directory: string
    readonly #release: () => Promise<void>
    #closed = false

    constructor(directory: string, release: () => Promise<void>){
        this.#directory = directory
        this.#release = release
    }


    public async read(key: string): Promise<Uint8Array|null> {
        this.#checkOpen()
        try {
            const buffer = await readFile(this.#fileOf(key))
            return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        } catch(error){
            if(codeOf(error) === "ENOENT") return null
            throw error
        }
    }

    /**
     * Writes a temporary file, flushes it to the disk, then renames it over the save. A crash during the
     * write leaves the old save intact and an orphan temporary file, which the next write overwrites.
     */
    public async write(key: string, data: Uint8Array): Promise<void> {
        this.#checkOpen()
        const file = this.#fileOf(key)
        const temporary = `${file}${TEMPORARY_EXTENSION}`
        const handle = await open(temporary, "w")
        try {
            await handle.writeFile(data)
            await handle.sync()
        } finally {
            await handle.close()
        }
        await renameWithRetries(temporary, file)
    }

    public async remove(key: string): Promise<void> {
        this.#checkOpen()
        await rm(this.#fileOf(key), { force: true })
    }

    public async close(): Promise<void> {
        this.#checkOpen()
        this.#closed = true
        await this.#release()
    }


    #fileOf(key: string): string {
        return join(this.#directory, `${key}${SAVE_EXTENSION}`)
    }

    #checkOpen(): void {
        if(this.#closed) throw new Error("This PlayerStorage is closed. Open the StoragePort again.")
    }
}

async function renameWithRetries(from: string, to: string): Promise<void> {
    for(let attempt = 0; ; attempt++){
        try {
            await rename(from, to)
            return
        } catch(error){
            const isHeldForAMoment = codeOf(error) === "EPERM" || codeOf(error) === "EBUSY"
            if(!isHeldForAMoment || attempt === RENAME_RETRIES) throw error
            await delay(RENAME_RETRY_DELAY)
        }
    }
}
