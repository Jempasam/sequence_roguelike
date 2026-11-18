import { describe, expect, test } from "vitest"
import { MemoryStorage, SaveSlot } from "@game/core"
import { HISTORY_FORMAT, HISTORY_SLOT_KEY, loadedHeroes } from "@game/core/mecard"
import { RunHistorian } from "@game/core/mecard/persist"

import { startedRun } from "../../../fixtures/startedRun"

// --- Fixture builders ---

/** The slot of the history in a storage of memory. */
async function slotOf() {
    const storage = await new MemoryStorage().open()
    return new SaveSlot(storage!, HISTORY_SLOT_KEY, HISTORY_FORMAT)
}

const settle = () => new Promise(resolve => setTimeout(resolve, 5))

// --- Tests ---

describe("RunHistorian", () => {
    test("nothing happened → empty history", async() => {
        const slot = await slotOf()
        const historian = new RunHistorian(startedRun(1), slot, () => 1, () => {})
        expect(await slot.load()).toBeNull()
        historian.dispose()
    })

    test("the party fell → the game is written with its date, its depth and its party", async() => {
        const slot = await slotOf()
        const run = startedRun(1)
        const historian = new RunHistorian(run, slot, () => 9, () => {}, () => 1234)
        run.gold = 17
        run.defeated.notify(run)
        await settle()
        const entries = (await slot.load())!.entries
        expect(entries.length).toBe(1)
        expect(entries[0]).toMatchObject({ date: 1234, seed: 9, gold: 17, depth: run.travel.depth })
        const names = loadedHeroes(entries[0].heroes).map(hero => hero.name)
        expect(names).toEqual(run.heroes.map(hero => hero.name))
        historian.dispose()
    })

    test("two games → both kept, in order of play", async() => {
        const slot = await slotOf()
        const first = startedRun(1)
        const historian = new RunHistorian(first, slot, () => 1, () => {})
        first.gold = 1
        first.defeated.notify(first)
        await settle()
        const second = startedRun(2)
        historian.engine = second
        second.gold = 2
        second.defeated.notify(second)
        await settle()
        expect((await slot.load())!.entries.map(entry => entry.gold)).toEqual([1, 2])
        historian.dispose()
    })
})
