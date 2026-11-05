import type { PlayerStorage } from "../../platform"

import { checkJson } from "./checkJson"
import { MAX_FORMAT_VERSION, openEnvelope, sealEnvelope } from "./Envelope"
import { SaveError } from "./SaveError"
import type { SaveFormat } from "./SaveFormat"

/** What a key is written with. Adapters turn it into a file name or a database key as is. */
const KEY = /^[a-z0-9-]+$/

/**
 * One thing the game saves on its own rhythm, such as the settings or the run in progress, under its own
 * key and in its own format.
 *
 * @remarks
 * Every operation runs after the previous one has finished, in the order of the calls. Two saves started
 * one after the other could otherwise end out of order, and leave the older state on the disk.
 *
 * Nothing is ever removed on its own: a save that cannot be loaded stays where it is, since a more recent
 * version of the game may still read it.
 */
export class SaveSlot<T> {


    constructor(
        /** The storage of the player the save is kept in. */
        public readonly storage: PlayerStorage,

        /** The key of the save, written `[a-z0-9-]+`. */
        public readonly key: string,

        /** How the save is written and read back. */
        public readonly format: SaveFormat<T>,
    ){
        if(!KEY.test(key)) throw new Error(`The save key "${key}" is not written ${KEY.source}.`)
        const { version, migrations } = format
        if(!Number.isInteger(version) || version < 1 || version > MAX_FORMAT_VERSION){
            throw new Error(`The save "${key}" has version ${version}, not an integer from 1 to ${MAX_FORMAT_VERSION}.`)
        }
        if(migrations.length !== version - 1){
            throw new Error(`The save "${key}" is at version ${version}, so it needs ${version - 1} migrations, not ${migrations.length}.`)
        }
    }


    /**
     * Write a state, always at the latest version.
     *
     * @throws {@link Error} When the JSON of the state holds a value JSON cannot, giving its path.
     */
    public save(state: T): Promise<void> {
        // Encoded right away, so the state is the one of this call even if it changes while the previous
        // operations run.
        const json = this.format.encode(state)
        checkJson(json, this.key)
        const payload = new TextEncoder().encode(JSON.stringify(json))
        const bytes = sealEnvelope(this.format.version, payload)
        return this.#enqueue(() => this.storage.write(this.key, bytes))
    }

    /**
     * Read the state back, migrated to the latest version.
     *
     * @returns The state, none when nothing was saved.
     * @throws {@link SaveError} When the save is damaged, too new for this version of the game, or refused.
     */
    public load(): Promise<T|null> {
        return this.#enqueue(async() => {
            const bytes = await this.storage.read(this.key)
            return bytes ? this.#stateOf(bytes) : null
        })
    }

    /** Remove the save. Removing a save that does not exist does nothing. */
    public remove(): Promise<void> {
        return this.#enqueue(() => this.storage.remove(this.key))
    }


    /** Settles once the last operation called has finished, failed or not. */
    #queue: Promise<unknown> = Promise.resolve()

    #enqueue<R>(operation: () => Promise<R>): Promise<R> {
        const result = this.#queue.then(operation)
        // The failure reaches the caller through result. The queue only orders the operations, so the
        // next one runs after a failed one as well.
        this.#queue = result.catch(() => undefined)
        return result
    }

    #stateOf(bytes: Uint8Array): T {
        const content = openEnvelope(bytes)
        if(typeof content === "string") throw new SaveError(this.key, "corrupt", `${content}.`)
        const { formatVersion, payload } = content
        if(formatVersion > this.format.version){
            const message = `it is at version ${formatVersion}, and this version of the game reads up to ${this.format.version}.`
            throw new SaveError(this.key, "too-new", message)
        }
        if(formatVersion < 1) throw new SaveError(this.key, "corrupt", "it is at version 0, which does not exist.")
        let json = this.#parse(payload)
        for(let version = formatVersion; version < this.format.version; version++){
            try {
                json = this.format.migrations[version - 1](json)
            } catch(cause){
                throw new SaveError(this.key, "invalid", `the migration from version ${version} refused it.`, { cause })
            }
        }
        try {
            return this.format.decode(json)
        } catch(cause){
            throw new SaveError(this.key, "invalid", "decode refused it.", { cause })
        }
    }

    #parse(payload: Uint8Array): unknown {
        try {
            return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(payload))
        } catch(cause){
            throw new SaveError(this.key, "corrupt", "its content is not JSON in UTF-8.", { cause })
        }
    }
}
