import {
    readParticipateMessage, readParticipationMessage, writeParticipateMessage, writeParticipationMessage,
} from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { expectNoneOf } from "../messageFixtures"

describe("Participate message", () => {
    test("join with options → read back the same", () => {
        const message = { kind: "join", game: 3, options: { lives: 2, side: "red" } } as const
        expect(readParticipateMessage(writeParticipateMessage(message))).toEqual(message)
    })

    test("join without options → read with no options field", () => {
        const read = readParticipateMessage(writeParticipateMessage({ kind: "join", game: 1 }))
        expect(read).toEqual({ kind: "join", game: 1 })
        expect(read).not.toHaveProperty("options")
    })

    test("quit → read back", () => {
        expect(readParticipateMessage(writeParticipateMessage({ kind: "quit", game: 1 }))).toEqual({ kind: "quit", game: 1 })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readParticipateMessage, [
            "{}",
            "{\"kind\":\"join\"}",
            "{\"game\":1}",
            "{\"kind\":\"leave\",\"game\":1}",
            "{\"kind\":\"join\",\"game\":\"1\"}",
            "{\"kind\":\"join\",\"game\":1,\"options\":null}",
            "{\"kind\":\"join\",\"game\":1,\"options\":[]}",
            "{\"kind\":\"join\",\"game\":1,\"options\":{\"a\":true}}",
            "{\"kind\":\"join\",\"game\":1,\"options\":\"x\"}",
        ])
    })
})

describe("Participation message", () => {
    test.each([
        { game: 1, role: "player", seat: "red" },
        { game: 1, role: "player", seat: null },
        { game: 2, role: "spectator", seat: null },
    ] as const)("written → read back the same (%j)", message => {
        expect(readParticipationMessage(writeParticipationMessage(message))).toEqual(message)
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readParticipationMessage, [
            "{}",
            "{\"game\":1,\"role\":\"player\"}",
            "{\"game\":1,\"role\":\"referee\",\"seat\":null}",
            "{\"game\":\"1\",\"role\":\"player\",\"seat\":null}",
            "{\"game\":1,\"role\":\"player\",\"seat\":3}",
        ])
    })
})
