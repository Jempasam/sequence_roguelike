import { describe, expect, test } from "vitest"
import {
    allCards, FusionCard, ITEMS, loadRun, RED_HEART, Run, RUN_SAVE_VERSION, saveRun, splitDeck, USABLES,
} from "@game/core/mecard"
import type { RunSave } from "@game/core/mecard"

// --- Fixture builders ---

/** A save as it comes through a channel. */
function sent(run: Run): RunSave {
    return JSON.parse(JSON.stringify(saveRun(run))) as RunSave
}

/** A run with something of everything a party may hold. */
function furnished(): Run {
    const run = new Run(21)
    const [first, second] = run.heroes
    splitDeck(first, first.decks[0], run.rng)
    run.giveItem(first, ITEMS[0])
    run.giveUsable(first, USABLES[0])
    run.giveHeart(second, RED_HEART)
    second.hearts[0].isEmpty = true
    const fused = new FusionCard(allCards(second).slice(0, 2))
    run.changeDeck(second.decks[0], deck => deck.push(fused, fused))
    run.gold = 123
    return run
}

// --- Tests ---

describe("saveRun", () => {
    test("a new run → the same save once read back", () => {
        const save = sent(new Run(4))
        expect(sent(loadRun(save))).toEqual(save)
    })

    test("a party holding a bit of everything → the same save once read back", () => {
        const save = sent(furnished())
        const loaded = loadRun(save)
        expect(sent(loaded)).toEqual(save)
        expect(loaded.gold).toBe(123)
    })

    test("two characters merged → the same save once read back", () => {
        const run = furnished()
        run.merge(run.heroes[0], run.heroes[1])
        const save = sent(run)
        expect(sent(loadRun(save))).toEqual(save)
    })

    test("a run read back → draws the same numbers as the one saved", () => {
        const run = furnished()
        const loaded = loadRun(sent(run))
        expect(loaded.rng.next()).toBe(run.rng.next())
    })

    test("copies of a fusion → one card again", () => {
        const loaded = loadRun(sent(furnished()))
        const [last, before] = [...loaded.heroes[1].decks[0]].reverse()
        expect(last).toBe(before)
    })

    test("during a battle → refused", () => {
        const run = new Run(4)
        run.startBattle()
        expect(() => saveRun(run)).toThrow("fight")
    })

    test("a save of another version → refused", () => {
        const save = { ...saveRun(new Run(4)), version: RUN_SAVE_VERSION + 1 }
        expect(() => loadRun(save)).toThrow("version")
    })
})
