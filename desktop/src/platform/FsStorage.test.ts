import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vitest"
import { describeStorageContract } from "@game/test/storageContract"

import { FsStorage } from "./FsStorage"

// --- Fixture builders ---

const ROOT = mkdtempSync(join(tmpdir(), "roguelike-fs-storage-"))
let count = 0

afterAll(() => rmSync(ROOT, { recursive: true, force: true }))

/** A folder inside ROOT that does not exist yet, so open creates it as it would on first launch. */
function newDirectory(): string {
    return join(ROOT, String(count++))
}

/** A folder holding a lock file with this content, as a crashed instance leaves it. */
function directoryLockedWith(content: string): string {
    const directory = newDirectory()
    mkdirSync(directory)
    writeFileSync(join(directory, "lock"), content)
    return directory
}

/** The PID of a process that ran and exited, so no process has it anymore. */
function deadPid(): number {
    const { pid } = spawnSync(process.execPath, ["-e", ""])
    if(pid === undefined) throw new Error("The short-lived process did not start.")
    return pid
}

// --- Tests ---

describeStorageContract("FsStorage", () => new FsStorage(newDirectory()))

describe("FsStorage.open", () => {
    test("lock left by a dead process → taken over", async() => {
        const storage = await new FsStorage(directoryLockedWith(String(deadPid()))).open()
        expect(storage).not.toBeNull()
        await storage?.close()
    })

    test("lock left empty by a crash → taken over", async() => {
        const storage = await new FsStorage(directoryLockedWith("")).open()
        expect(storage).not.toBeNull()
        await storage?.close()
    })

    test("close → lock file removed", async() => {
        const directory = newDirectory()
        const storage = await new FsStorage(directory).open()
        expect(existsSync(join(directory, "lock"))).toBe(true)
        await storage?.close()
        expect(existsSync(join(directory, "lock"))).toBe(false)
    })

    test("write → no temporary file left", async() => {
        const directory = newDirectory()
        const storage = await new FsStorage(directory).open()
        await storage?.write("settings", Uint8Array.from([1]))
        await storage?.close()
        expect(existsSync(join(directory, "settings.sav"))).toBe(true)
        expect(existsSync(join(directory, "settings.sav.tmp"))).toBe(false)
    })
})
