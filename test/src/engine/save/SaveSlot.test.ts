import { crc32 } from "node:zlib"
import { describe, expect, test } from "vitest"
import { MemoryStorage, SaveError, SaveSlot } from "@game/core"
import type { PlayerStorage, SaveFormat } from "@game/core"

// --- Fixture builders ---

interface Settings {
    readonly volume: number
}

/** Settings at version 3: version 1 had `sound` out of 10, version 2 `level` out of 1. */
const SETTINGS_FORMAT: SaveFormat<Settings> = {
    version: 3,
    migrations: [
        json => ({ level: field(json, "sound") / 10 }),
        json => ({ volume: field(json, "level") }),
    ],
    encode: settings => ({ volume: settings.volume }),
    decode: json => ({ volume: field(json, "volume") }),
}

/** A save of any value, written as it is, to try what JSON can hold. */
const AS_IS_FORMAT: SaveFormat<unknown> = {
    version: 1,
    migrations: [],
    encode: state => state,
    decode: json => json,
}

function field(json: unknown, name: string): number {
    const value = typeof json === "object" && json !== null ? (json as Record<string, unknown>)[name] : undefined
    if(typeof value !== "number") throw new Error(`${name} is not a number.`)
    return value
}

async function storage(): Promise<PlayerStorage> {
    const opened = await new MemoryStorage().open()
    if(!opened) throw new Error("A new MemoryStorage is held already.")
    return opened
}

/** A save as the game writes it, built independently of the code under test. */
function envelope(formatVersion: number, payload: string, damage: Partial<Record<"magic"|"length"|"crc", true>> = {}): Uint8Array {
    const content = new TextEncoder().encode(payload)
    const bytes = new Uint8Array(16 + content.length)
    const view = new DataView(bytes.buffer)
    bytes.set(new TextEncoder().encode(damage.magic ? "XXXX" : "RGLK"))
    view.setUint16(4, 1, true)
    view.setUint16(6, formatVersion, true)
    view.setUint32(8, content.length + (damage.length ? 1 : 0), true)
    view.setUint32(12, crc32(content) ^ (damage.crc ? 1 : 0), true)
    bytes.set(content, 16)
    return bytes
}

async function loadErrorOf(slot: SaveSlot<unknown>): Promise<SaveError> {
    const error = await slot.load().then(() => null, (e: unknown) => e)
    if(error instanceof SaveError) return error
    throw new Error(`No SaveError was thrown, but ${String(error)}.`)
}

/** A storage whose first write ends after the second one, as two writes racing on a disk could. */
function racingStorage(inner: PlayerStorage): PlayerStorage {
    let writes = 0
    return {
        read: key => inner.read(key),
        remove: key => inner.remove(key),
        close: () => inner.close(),
        write: async(key, data) => {
            const isFirst = writes++ === 0
            await new Promise(resolve => queueMicrotask(() => resolve(undefined)))
            if(isFirst) for(let i = 0; i < 10; i++) await Promise.resolve()
            await inner.write(key, data)
        },
    }
}

/** A storage the constructor tests never reach. */
class UnreachedStorage implements PlayerStorage {


    async read(): Promise<Uint8Array|null> { throw new Error("Not reached.") }

    async write(): Promise<void> { throw new Error("Not reached.") }

    async remove(): Promise<void> { throw new Error("Not reached.") }

    async close(): Promise<void> { throw new Error("Not reached.") }
}

// --- Tests ---

describe("SaveSlot.constructor", () => {
    test("key with an uppercase letter → throws", () => {
        expect(() => new SaveSlot(new UnreachedStorage(), "Settings", SETTINGS_FORMAT)).toThrow(/Settings/)
    })

    test("key with a dot → throws", () => {
        expect(() => new SaveSlot(new UnreachedStorage(), "../run", SETTINGS_FORMAT)).toThrow()
    })

    test("migrations not version - 1 → throws", () => {
        const format = { ...SETTINGS_FORMAT, migrations: [] }
        expect(() => new SaveSlot(new UnreachedStorage(), "settings", format)).toThrow(/2 migrations/)
    })

    test("version 0 → throws", () => {
        const format = { ...SETTINGS_FORMAT, version: 0, migrations: [] }
        expect(() => new SaveSlot(new UnreachedStorage(), "settings", format)).toThrow()
    })
})

describe("SaveSlot.save", () => {
    test("save then load → same state", async() => {
        const slot = new SaveSlot(await storage(), "settings", SETTINGS_FORMAT)
        await slot.save({ volume: 0.5 })
        expect(await slot.load()).toEqual({ volume: 0.5 })
    })

    test("written → envelope at the latest version, JSON payload", async() => {
        const store = await storage()
        await new SaveSlot(store, "settings", SETTINGS_FORMAT).save({ volume: 0.5 })
        expect(await store.read("settings")).toEqual(envelope(3, "{\"volume\":0.5}"))
    })

    test("NaN deep inside → throws with its path, nothing written", async() => {
        const store = await storage()
        const slot = new SaveSlot(store, "run", AS_IS_FORMAT)
        expect(() => slot.save({ entities: [{}, {}, {}, { hp: NaN }] })).toThrow("run.entities[3].hp is NaN")
        expect(await store.read("run")).toBeNull()
    })

    test.each([
        ["Infinity", Infinity, "run.value is Infinity"],
        ["undefined", undefined, "run.value is undefined"],
        ["a Map", new Map(), "run.value is a Map"],
        ["a Uint8Array", new Uint8Array(1), "run.value is a Uint8Array"],
        ["a bigint", 1n, "run.value is a bigint"],
        ["a function", () => 1, "run.value is a function"],
    ])("%s → throws with its path", async(_, value, message) => {
        const slot = new SaveSlot(await storage(), "run", AS_IS_FORMAT)
        expect(() => slot.save({ value })).toThrow(message)
    })

    test("key not an identifier → quoted in the path", async() => {
        const slot = new SaveSlot(await storage(), "run", AS_IS_FORMAT)
        expect(() => slot.save({ "max hp": NaN })).toThrow("run[\"max hp\"] is NaN")
    })

    test("cycle → throws instead of overflowing", async() => {
        const slot = new SaveSlot(await storage(), "run", AS_IS_FORMAT)
        const state: Record<string, unknown> = {}
        state.self = state
        expect(() => slot.save(state)).toThrow("run.self refers back")
    })

    test("same object twice, not a cycle → saved", async() => {
        const slot = new SaveSlot(await storage(), "run", AS_IS_FORMAT)
        const shared = { hp: 1 }
        await slot.save({ a: shared, b: shared })
        expect(await slot.load()).toEqual({ a: { hp: 1 }, b: { hp: 1 } })
    })

    test("two saves not awaited, first write slower → the last one called is kept", async() => {
        const slot = new SaveSlot(racingStorage(await storage()), "settings", SETTINGS_FORMAT)
        const first = slot.save({ volume: 0.1 })
        const second = slot.save({ volume: 0.9 })
        await Promise.all([first, second])
        expect(await slot.load()).toEqual({ volume: 0.9 })
    })

    test("state changed after save is called → the state of the call is written", async() => {
        const slot = new SaveSlot(await storage(), "settings", SETTINGS_FORMAT)
        const state = { volume: 0.2 }
        const saving = slot.save(state)
        state.volume = 0.7
        await saving
        expect(await slot.load()).toEqual({ volume: 0.2 })
    })
})

describe("SaveSlot.load", () => {
    test("nothing saved → null", async() => {
        expect(await new SaveSlot(await storage(), "settings", SETTINGS_FORMAT).load()).toBeNull()
    })

    test("version 1 → migrated twice", async() => {
        const store = await storage()
        await store.write("settings", envelope(1, "{\"sound\":4}"))
        expect(await new SaveSlot(store, "settings", SETTINGS_FORMAT).load()).toEqual({ volume: 0.4 })
    })

    test("version 2 → migrated once", async() => {
        const store = await storage()
        await store.write("settings", envelope(2, "{\"level\":0.3}"))
        expect(await new SaveSlot(store, "settings", SETTINGS_FORMAT).load()).toEqual({ volume: 0.3 })
    })

    test("migrated save, saved again → written at the latest version", async() => {
        const store = await storage()
        await store.write("settings", envelope(1, "{\"sound\":5}"))
        const slot = new SaveSlot(store, "settings", SETTINGS_FORMAT)
        await slot.save(await slot.load() ?? { volume: 0 })
        expect(await store.read("settings")).toEqual(envelope(3, "{\"volume\":0.5}"))
    })

    test.each([
        ["wrong magic", envelope(3, "{\"volume\":1}", { magic: true })],
        ["wrong length", envelope(3, "{\"volume\":1}", { length: true })],
        ["wrong CRC", envelope(3, "{\"volume\":1}", { crc: true })],
        ["not JSON", envelope(3, "{volume")],
        ["version 0", envelope(0, "{\"volume\":1}")],
        ["truncated", envelope(3, "{\"volume\":1}").subarray(0, 20)],
        ["empty", new Uint8Array(0)],
    ])("%s → corrupt", async(_, bytes) => {
        const store = await storage()
        await store.write("settings", bytes)
        const error = await loadErrorOf(new SaveSlot(store, "settings", SETTINGS_FORMAT))
        expect(error).toMatchObject({ key: "settings", reason: "corrupt" })
    })

    test("version newer than the game → too-new", async() => {
        const store = await storage()
        await store.write("settings", envelope(4, "{\"volume\":1}"))
        const error = await loadErrorOf(new SaveSlot(store, "settings", SETTINGS_FORMAT))
        expect(error.reason).toBe("too-new")
    })

    test("decode refuses → invalid", async() => {
        const store = await storage()
        await store.write("settings", envelope(3, "{\"volume\":\"loud\"}"))
        expect((await loadErrorOf(new SaveSlot(store, "settings", SETTINGS_FORMAT))).reason).toBe("invalid")
    })

    test("migration refuses → invalid", async() => {
        const store = await storage()
        await store.write("settings", envelope(1, "{}"))
        expect((await loadErrorOf(new SaveSlot(store, "settings", SETTINGS_FORMAT))).reason).toBe("invalid")
    })

    test("unreadable save → left where it is", async() => {
        const store = await storage()
        const damaged = envelope(3, "{\"volume\":1}", { crc: true })
        await store.write("settings", damaged)
        await loadErrorOf(new SaveSlot(store, "settings", SETTINGS_FORMAT))
        expect(await store.read("settings")).toEqual(damaged)
    })
})

describe("SaveSlot.remove", () => {
    test("saved then removed → null", async() => {
        const slot = new SaveSlot(await storage(), "run", SETTINGS_FORMAT)
        await slot.save({ volume: 1 })
        await slot.remove()
        expect(await slot.load()).toBeNull()
    })

    test("save then remove not awaited → removed", async() => {
        const slot = new SaveSlot(racingStorage(await storage()), "run", SETTINGS_FORMAT)
        const saving = slot.save({ volume: 1 })
        const removing = slot.remove()
        await Promise.all([saving, removing])
        expect(await slot.load()).toBeNull()
    })
})
