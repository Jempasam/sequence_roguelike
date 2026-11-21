import {
    readModeState, readProfileMessage, readRefusedMessage, readRosterMessage, readSelfMessage,
    writeModeState, writeProfileMessage, writeRefusedMessage, writeRosterMessage, writeSelfMessage,
} from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { expectNoneOf, expectUnreadable } from "../messageFixtures"

describe("ModeState message", () => {
    test("written → read back the same", () => {
        const state = { mode: "race", values: { lives: 3, name: "x" }, playing: true, game: 4 }
        expect(readModeState(writeModeState(state))).toEqual(state)
    })

    test("no setting → read with no values", () => {
        const state = { mode: "race", values: {}, playing: false, game: 0 }
        expect(readModeState(writeModeState(state))).toEqual(state)
    })

    test("not a message → unreadable, never a throw", () => {
        expectNoneOf(readModeState)
    })

    test.each([
        ["mode missing", { values: {}, playing: false, game: 1 }],
        ["mode not a text", { mode: 1, values: {}, playing: false, game: 1 }],
        ["playing not a boolean", { mode: "m", values: {}, playing: "yes", game: 1 }],
        ["game not a number", { mode: "m", values: {}, playing: false, game: "1" }],
        ["values missing", { mode: "m", playing: false, game: 1 }],
        ["values an array", { mode: "m", values: [], playing: false, game: 1 }],
        ["a value that is a boolean", { mode: "m", values: { a: true }, playing: false, game: 1 }],
        ["a value that is nested", { mode: "m", values: { a: { b: 1 } }, playing: false, game: 1 }],
    ])("%s → unreadable", (_, body) => {
        const text = JSON.stringify(body)
        expectUnreadable(readModeState(text), text)
    })

    test("unknown extra fields → left out of what is read", () => {
        const read = readModeState(JSON.stringify({ mode: "m", values: {}, playing: false, game: 1, extra: 1 }))
        expect(read).toEqual({ mode: "m", values: {}, playing: false, game: 1 })
    })
})

describe("Profile message", () => {
    test("written → read back the same", () => {
        expect(readProfileMessage(writeProfileMessage({ version: 2, name: "Ana" }))).toEqual({ version: 2, name: "Ana" })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readProfileMessage, ["{}", "{\"version\":1}", "{\"name\":\"a\"}", "{\"version\":\"1\",\"name\":\"a\"}"])
    })
})

describe("Roster message", () => {
    test("written → read back the same, in order", () => {
        const roster = { members: [{ id: "host", name: "A", lost: false }, { id: "p1", name: "B", lost: true }] }
        expect(readRosterMessage(writeRosterMessage(roster))).toEqual(roster)
    })

    test("empty roster → read as empty", () => {
        expect(readRosterMessage(writeRosterMessage({ members: [] }))).toEqual({ members: [] })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readRosterMessage, [
            "{}",
            "{\"members\":1}",
            "{\"members\":[1]}",
            "{\"members\":[null]}",
            "{\"members\":[{\"id\":\"a\",\"name\":\"b\"}]}",
            "{\"members\":[{\"id\":\"a\",\"name\":\"b\",\"lost\":\"no\"}]}",
        ])
    })

    test("one bad entry among good ones → the whole roster is unreadable", () => {
        const text = JSON.stringify({ members: [{ id: "a", name: "b", lost: false }, { id: 1, name: "b", lost: false }] })
        expectUnreadable(readRosterMessage(text), text)
    })

    test("extra fields of an entry → left out", () => {
        const read = readRosterMessage(JSON.stringify({ members: [{ id: "a", name: "b", lost: false, extra: 1 }] }))
        expect(read).toEqual({ members: [{ id: "a", name: "b", lost: false }] })
    })
})

describe("Self message", () => {
    test("written → read back the same", () => {
        expect(readSelfMessage(writeSelfMessage({ id: "p1", name: "B" }))).toEqual({ id: "p1", name: "B" })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readSelfMessage, ["{}", "{\"id\":\"a\"}", "{\"id\":1,\"name\":\"b\"}"])
    })
})

describe("Refused message", () => {
    test("written → read back the same", () => {
        expect(readRefusedMessage(writeRefusedMessage({ ours: 7 }))).toEqual({ ours: 7 })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readRefusedMessage, ["{}", "{\"ours\":\"7\"}"])
    })
})
