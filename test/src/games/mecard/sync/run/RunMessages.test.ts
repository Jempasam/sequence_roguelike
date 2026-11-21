import { BATTLE_SAVE_VERSION, RUN_SAVE_VERSION } from "@game/core/mecard"
import {
    SEAT_RELEASE_TOPIC, SEAT_TAKE_TOPIC, UnreadableFault, readRunMessage, readSeatMessage,
    readSeatOfferMessage, readSeatWishMessage, writeRunMessage, writeSeatMessage, writeSeatOfferMessage,
    writeSeatWishMessage,
} from "@game/core/mecard/sync"
import type { RunMessage } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { expectNoneOf } from "../messageFixtures"

const RUN_REST = { kind: "save", number: 1, sequence: 2, save: { version: RUN_SAVE_VERSION } }
const RUN_BATTLE = { kind: "battle", number: 1, sequence: 3, save: { version: BATTLE_SAVE_VERSION } }

describe("Run message", () => {
    test("a rest → read back the same", () => {
        expect(readRunMessage(writeRunMessage(RUN_REST as unknown as RunMessage))).toEqual(RUN_REST)
    })

    test("a battle → read back the same", () => {
        expect(readRunMessage(writeRunMessage(RUN_BATTLE as unknown as RunMessage))).toEqual(RUN_BATTLE)
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readRunMessage, [
            "{}",
            JSON.stringify({ ...RUN_REST, kind: "other" }),
            JSON.stringify({ ...RUN_REST, number: "1" }),
            JSON.stringify({ ...RUN_REST, sequence: undefined }),
            JSON.stringify({ ...RUN_REST, save: null }),
            JSON.stringify({ ...RUN_REST, save: "x" }),
        ])
    })

    test("a rest saved in another version → unreadable, and the versions are told", () => {
        const text = JSON.stringify({ ...RUN_REST, save: { version: RUN_SAVE_VERSION + 1 } })
        const result = readRunMessage(text)
        expect(result).toBeInstanceOf(UnreadableFault)
        expect((result as UnreadableFault).detail).toContain(String(RUN_SAVE_VERSION + 1))
        expect((result as UnreadableFault).detail).toContain(String(RUN_SAVE_VERSION))
    })

    test("a battle saved in another version → unreadable", () => {
        const text = JSON.stringify({ ...RUN_BATTLE, save: { version: BATTLE_SAVE_VERSION + 1 } })
        expect(readRunMessage(text)).toBeInstanceOf(UnreadableFault)
    })

    test("a save without a version → unreadable, told as none", () => {
        const result = readRunMessage(JSON.stringify({ ...RUN_REST, save: {} }))
        expect(result).toBeInstanceOf(UnreadableFault)
        expect((result as UnreadableFault).detail).toContain("none")
    })
})

describe("Seat message", () => {
    test("written → read back the same", () => {
        expect(readSeatMessage(writeSeatMessage({ units: ["a", "b"] }))).toEqual({ units: ["a", "b"] })
        expect(readSeatMessage(writeSeatMessage({ units: [] }))).toEqual({ units: [] })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readSeatMessage, ["{}", "{\"units\":\"a\"}", "{\"units\":null}"])
    })
})

describe("Seat offer message", () => {
    test("written → read back the same", () => {
        const offer = { candidates: ["a", "b"], held: { c: "p1" }, reserved: { d: "p2" } }
        expect(readSeatOfferMessage(writeSeatOfferMessage(offer))).toEqual(offer)
    })

    test("no reserved seat → read without it", () => {
        const offer = { candidates: [], held: {} }
        expect(readSeatOfferMessage(writeSeatOfferMessage(offer))).toEqual(offer)
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readSeatOfferMessage, [
            "{}",
            "{\"candidates\":[]}",
            "{\"held\":{}}",
            "{\"candidates\":[1],\"held\":{}}",
            "{\"candidates\":[],\"held\":[]}",
            "{\"candidates\":[],\"held\":null}",
            "{\"candidates\":[],\"held\":{\"a\":1}}",
            "{\"candidates\":[],\"held\":{},\"reserved\":null}",
            "{\"candidates\":[],\"held\":{},\"reserved\":[]}",
            "{\"candidates\":[],\"held\":{},\"reserved\":{\"a\":1}}",
        ])
    })
})

describe("Seat wish message", () => {
    test.each([SEAT_TAKE_TOPIC, SEAT_RELEASE_TOPIC])("written → read back on %s", topic => {
        expect(readSeatWishMessage(topic, writeSeatWishMessage({ unit: "knight" }))).toEqual({ unit: "knight" })
    })

    test.each([SEAT_TAKE_TOPIC, SEAT_RELEASE_TOPIC])("not a message → unreadable, naming %s", topic => {
        expectNoneOf(text => readSeatWishMessage(topic, text), ["{}", "{\"unit\":1}"])
        const result = readSeatWishMessage(topic, "{}")
        expect(result).toMatchObject({ topic: topic.name })
    })
})
