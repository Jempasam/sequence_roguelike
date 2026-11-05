import { describe, expect, test } from "vitest"
import type { PlayerStorage, StoragePort } from "@game/core"

/**
 * The behavior every {@link StoragePort} shares, run on each implementation: in memory, on the file
 * system, and on IndexedDB.
 *
 * @param name - The name of the implementation, in the test names.
 * @param create - A new, empty storage on each call.
 */
export function describeStorageContract(name: string, create: () => StoragePort|Promise<StoragePort>): void {
    describe(`${name} (StoragePort contract)`, () => {
        test("key never written → null", async() => {
            await withStorage(await create(), async storage => {
                expect(await storage.read("settings")).toBeNull()
            })
        })

        test("write then read → same bytes", async() => {
            await withStorage(await create(), async storage => {
                await storage.write("settings", bytes(1, 2, 3))
                expect(await storage.read("settings")).toEqual(bytes(1, 2, 3))
            })
        })

        test("second write → replaces the first", async() => {
            await withStorage(await create(), async storage => {
                await storage.write("settings", bytes(1, 2, 3))
                await storage.write("settings", bytes(4))
                expect(await storage.read("settings")).toEqual(bytes(4))
            })
        })

        test("keys → kept apart", async() => {
            await withStorage(await create(), async storage => {
                await storage.write("settings", bytes(1))
                await storage.write("profile", bytes(2))
                expect(await storage.read("settings")).toEqual(bytes(1))
                expect(await storage.read("profile")).toEqual(bytes(2))
            })
        })

        test("data changed after write → not what is stored", async() => {
            await withStorage(await create(), async storage => {
                const data = bytes(1, 2, 3)
                await storage.write("settings", data)
                data[0] = 9
                expect(await storage.read("settings")).toEqual(bytes(1, 2, 3))
            })
        })

        test("view into a larger buffer → only the view is stored", async() => {
            await withStorage(await create(), async storage => {
                await storage.write("settings", bytes(0, 1, 2, 3, 4).subarray(1, 3))
                expect(await storage.read("settings")).toEqual(bytes(1, 2))
            })
        })

        test("remove → null", async() => {
            await withStorage(await create(), async storage => {
                await storage.write("settings", bytes(1))
                await storage.remove("settings")
                expect(await storage.read("settings")).toBeNull()
            })
        })

        test("remove a key never written → resolves", async() => {
            await withStorage(await create(), async storage => {
                await expect(storage.remove("settings")).resolves.toBeUndefined()
            })
        })

        test("second open → null until the first is closed", async() => {
            const port = await create()
            const first = await openOrFail(port)
            expect(await port.open()).toBeNull()
            await first.close()
            const second = await openOrFail(port)
            await second.close()
        })

        test("close then open → data kept", async() => {
            const port = await create()
            const first = await openOrFail(port)
            await first.write("settings", bytes(1, 2))
            await first.close()
            await withStorage(port, async storage => {
                expect(await storage.read("settings")).toEqual(bytes(1, 2))
            })
        })

        test("any call after close → rejects", async() => {
            const storage = await openOrFail(await create())
            await storage.close()
            await expect(storage.read("settings")).rejects.toThrow()
            await expect(storage.write("settings", bytes(1))).rejects.toThrow()
            await expect(storage.remove("settings")).rejects.toThrow()
            await expect(storage.close()).rejects.toThrow()
        })
    })
}

function bytes(...values: number[]): Uint8Array {
    return Uint8Array.from(values)
}

async function openOrFail(port: StoragePort): Promise<PlayerStorage> {
    const storage = await port.open()
    if(!storage) throw new Error("The storage is held already.")
    return storage
}

/** Run a test on an open storage, and close it after, so no lock outlives its test. */
async function withStorage(port: StoragePort, run: (storage: PlayerStorage) => Promise<void>): Promise<void> {
    const storage = await openOrFail(port)
    try {
        await run(storage)
    } finally {
        await storage.close()
    }
}
