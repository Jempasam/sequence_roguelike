import { TRAVEL_SAVE_VERSION } from "@game/core-src/games/mecard/sim/save/travelSave"
import { UnreadableFault } from "@game/core-src/games/mecard/sync/faults"
import { readTravelMessage, writeTravelMessage } from "@game/core-src/games/mecard/sync/travel/TravelMessage"
import type { TravelMessage } from "@game/core-src/games/mecard/sync/travel/TravelMessage"
import { describe, expect, test } from "vitest"

import { expectNoneOf } from "../messageFixtures"

const MOVE = { kind: "moved", number: 1, sequence: 2, from: 3, to: 4, depth: 5 }
const REST = { kind: "save", number: 1, sequence: 3, save: { version: TRAVEL_SAVE_VERSION } }

describe("Travel message", () => {
    test("a move → read back the same", () => {
        expect(readTravelMessage(writeTravelMessage(MOVE as TravelMessage))).toEqual(MOVE)
    })

    test("a first move, from nowhere → read back with from null", () => {
        const first = { ...MOVE, from: null }
        expect(readTravelMessage(writeTravelMessage(first as TravelMessage))).toEqual(first)
    })

    test("a rest → read back the same", () => {
        expect(readTravelMessage(writeTravelMessage(REST as unknown as TravelMessage))).toEqual(REST)
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readTravelMessage, [
            "{}",
            JSON.stringify({ ...MOVE, kind: "other" }),
            JSON.stringify({ ...MOVE, number: "1" }),
            JSON.stringify({ ...MOVE, sequence: undefined }),
            JSON.stringify({ ...MOVE, to: "4" }),
            JSON.stringify({ ...MOVE, depth: null }),
            JSON.stringify({ ...MOVE, from: "3" }),
            JSON.stringify({ ...MOVE, from: undefined }),
            JSON.stringify({ ...REST, save: null }),
            JSON.stringify({ ...REST, save: "x" }),
        ])
    })

    test("a rest saved in another version → unreadable, and the versions are told", () => {
        const other = { ...REST, save: { version: TRAVEL_SAVE_VERSION + 1 } }
        const result = readTravelMessage(JSON.stringify(other))
        expect(result).toBeInstanceOf(UnreadableFault)
        expect((result as UnreadableFault).detail).toContain(String(TRAVEL_SAVE_VERSION + 1))
    })

    test("a move carrying no save → not asked for a version", () => {
        expect(readTravelMessage(JSON.stringify(MOVE))).toEqual(MOVE)
    })
})
