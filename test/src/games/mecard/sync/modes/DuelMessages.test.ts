import {
    readDuelFightMessage, readDuelWatchMessage, readLifeMessage, readProgressMessage, readRaceEndMessage,
    writeDuelFightMessage, writeDuelWatchMessage, writeLifeMessage, writeProgressMessage, writeRaceEndMessage,
} from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { expectNoneOf } from "../messageFixtures"

describe("Duel fight message", () => {
    test("written → read back the same", () => {
        const message = { number: 2, allies: ["a", "b"], opponents: ["c"], units: ["u1", "u2"] }
        expect(readDuelFightMessage(writeDuelFightMessage(message))).toEqual(message)
    })

    test("camps empty → still a message", () => {
        const message = { number: 0, allies: [], opponents: [], units: [] }
        expect(readDuelFightMessage(writeDuelFightMessage(message))).toEqual(message)
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readDuelFightMessage, [
            "{}",
            "{\"number\":1.5,\"allies\":[],\"opponents\":[],\"units\":[]}",
            "{\"number\":\"1\",\"allies\":[],\"opponents\":[],\"units\":[]}",
            "{\"number\":1,\"allies\":[1],\"opponents\":[],\"units\":[]}",
            "{\"number\":1,\"allies\":[],\"opponents\":\"c\",\"units\":[]}",
            "{\"number\":1,\"allies\":[],\"opponents\":[]}",
        ])
    })
})

describe("Duel watch message", () => {
    test("written → read back the same", () => {
        const message = { number: 1, sides: [["a", "b"], ["c"]] }
        expect(readDuelWatchMessage(writeDuelWatchMessage(message))).toEqual(message)
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readDuelWatchMessage, [
            "{}",
            "{\"number\":1}",
            "{\"number\":1,\"sides\":[\"a\"]}",
            "{\"number\":1,\"sides\":[[1]]}",
            "{\"number\":1.5,\"sides\":[]}",
        ])
    })
})

describe("Life message", () => {
    test("written → read back the same", () => {
        const message = { lives: { a: 3, b: 0 } }
        expect(readLifeMessage(writeLifeMessage(message))).toEqual(message)
    })

    test("nobody → read as empty", () => {
        expect(readLifeMessage(writeLifeMessage({ lives: {} }))).toEqual({ lives: {} })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readLifeMessage, [
            "{}", "{\"lives\":null}", "{\"lives\":3}", "{\"lives\":{\"a\":\"3\"}}", "{\"lives\":{\"a\":null}}",
        ])
    })
})

describe("Race end message", () => {
    test("a winner → read back", () => {
        expect(readRaceEndMessage(writeRaceEndMessage({ winner: "p1" }))).toEqual({ winner: "p1" })
    })

    test("nobody won → winner null", () => {
        expect(readRaceEndMessage(writeRaceEndMessage({ winner: null }))).toEqual({ winner: null })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readRaceEndMessage, ["{}", "{\"winner\":1}", "{\"winner\":{}}"])
    })
})

describe("Progress message", () => {
    const progress = { floor: 2, depth: 5, layer: 3, rows: 8, atDuel: false, inBattle: true, inHalt: false }

    test("written → read back the same", () => {
        expect(readProgressMessage(writeProgressMessage(progress))).toEqual(progress)
    })

    test("a peer that does not tell the rows → rows 0", () => {
        const without: Record<string, unknown> = { ...progress }
        delete without.rows
        expect(readProgressMessage(JSON.stringify(without))).toEqual({ ...progress, rows: 0 })
    })

    test("rows that are not a number → rows 0", () => {
        expect(readProgressMessage(JSON.stringify({ ...progress, rows: "8" }))).toMatchObject({ rows: 0 })
    })

    test.each(["floor", "depth", "layer", "atDuel", "inBattle", "inHalt"])("%s missing → unreadable", field => {
        const copy: Record<string, unknown> = { ...progress }
        delete copy[field]
        const result = readProgressMessage(JSON.stringify(copy))
        expect(result).toMatchObject({ detail: expect.any(String) })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readProgressMessage, ["{}", "{\"floor\":\"2\"}"])
    })
})
