import { describe, expect, test } from "vitest"
import { MemoryStorage, SaveSlot } from "@game/core"
import { RUN_SAVE_FORMAT, RUN_SLOT_KEY } from "@game/core/mecard"
import { RunSaver } from "@game/core/mecard/sync"

import { startedRun } from "../../../../fixtures/startedRun"

// --- Fixture builders ---

/** The slot of a run in a storage of memory. */
async function slotOf() {
    const storage = await new MemoryStorage().open()
    return new SaveSlot(storage!, RUN_SLOT_KEY, RUN_SAVE_FORMAT)
}

// --- Tests ---

describe("RunSaver", () => {
    test("nothing happened → nothing kept", async() => {
        const slot = await slotOf()
        const saver = new RunSaver(startedRun(1), slot, () => {})
        expect(await slot.load()).toBeNull()
        saver.dispose()
    })

    test("back on the map after a fight → the run kept as it stands", async() => {
        const slot = await slotOf()
        const run = startedRun(1)
        const saver = new RunSaver(run, slot, () => {})
        run.gold = 77
        run.startBattle()
        run.backToMap()
        expect((await slot.load())?.gold).toBe(77)
        saver.dispose()
    })

    test("a halt left → the run kept", async() => {
        const slot = await slotOf()
        const run = startedRun(1)
        const saver = new RunSaver(run, slot, () => {})
        run.gold = 12
        // What listens to the end of a visit does not read the halt that ended.
        run.travel.visitEnded.notify({} as never)
        expect((await slot.load())?.gold).toBe(12)
        saver.dispose()
    })

    test("a fight started and not left → the run not written", async() => {
        const slot = await slotOf()
        const run = startedRun(1)
        const saver = new RunSaver(run, slot, () => {})
        run.startBattle()
        run.gold = 5
        expect(await slot.load()).toBeNull()
        saver.dispose()
    })

    test("the party fell → what was kept is removed", async() => {
        const slot = await slotOf()
        const run = startedRun(1)
        const saver = new RunSaver(run, slot, () => {})
        run.startBattle()
        run.backToMap()
        expect(await slot.load()).not.toBeNull()
        run.defeated.notify(run)
        expect(await slot.load()).toBeNull()
        saver.dispose()
    })

    test("another run given → the new one kept, the old one no more", async() => {
        const slot = await slotOf()
        const first = startedRun(1)
        const second = startedRun(2)
        const saver = new RunSaver(first, slot, () => {})
        saver.engine = second
        second.gold = 31
        first.gold = 99
        first.startBattle()
        first.backToMap()
        expect(await slot.load()).toBeNull()
        second.startBattle()
        second.backToMap()
        expect((await slot.load())?.gold).toBe(31)
        saver.dispose()
    })

    test("disposed → nothing kept anymore", async() => {
        const slot = await slotOf()
        const run = startedRun(1)
        new RunSaver(run, slot, () => {}).dispose()
        run.startBattle()
        run.backToMap()
        expect(await slot.load()).toBeNull()
    })

    test("a slot that refuses to write → told, not thrown", async() => {
        const slot = await slotOf()
        const told: string[] = []
        const run = startedRun(1)
        slot.save = () => Promise.reject(new Error("disk full"))
        const saver = new RunSaver(run, slot, text => told.push(text))
        run.startBattle()
        run.backToMap()
        await new Promise(resolve => setTimeout(resolve))
        expect(told).toHaveLength(1)
        saver.dispose()
    })
})
