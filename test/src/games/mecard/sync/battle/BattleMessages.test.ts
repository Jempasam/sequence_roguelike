import { BATTLE_SAVE_VERSION } from "@game/core/mecard"
import { UnreadableFault, readBattleMessage, readPlanMessage, writeBattleMessage, writePlanMessage } from "@game/core/mecard/sync"
import type { BattleMessage } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { expectNoneOf } from "../messageFixtures"

const BATTLE = { kind: "save", number: 1, sequence: 1, secret: false, save: { version: BATTLE_SAVE_VERSION } }

describe("Battle message", () => {
    test.each(["save", "launch"])("%s → read back the same", kind => {
        const message = { ...BATTLE, kind }
        expect(readBattleMessage(writeBattleMessage(message as unknown as BattleMessage))).toEqual(message)
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readBattleMessage, [
            "{}",
            JSON.stringify({ ...BATTLE, kind: "other" }),
            JSON.stringify({ ...BATTLE, number: "1" }),
            JSON.stringify({ ...BATTLE, sequence: null }),
            JSON.stringify({ ...BATTLE, save: null }),
            JSON.stringify({ ...BATTLE, save: 3 }),
        ])
    })

    test("saved in another version → unreadable, and the versions are told", () => {
        const other = { ...BATTLE, save: { version: BATTLE_SAVE_VERSION + 1 } }
        const result = readBattleMessage(JSON.stringify(other))
        expect(result).toBeInstanceOf(UnreadableFault)
        expect((result as UnreadableFault).detail).toContain(String(BATTLE_SAVE_VERSION + 1))
    })
})

describe("Plan message", () => {
    test("written → read back the same", () => {
        const message = { round: 3, plans: [{ unit: "a", cards: [], usables: [0, 2] }] }
        expect(readPlanMessage(writePlanMessage(message))).toEqual(message)
    })

    test("no plan → still a message", () => {
        expect(readPlanMessage(writePlanMessage({ round: 1, plans: [] }))).toEqual({ round: 1, plans: [] })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readPlanMessage, ["{}", "{\"round\":1}", "{\"plans\":[]}", "{\"round\":\"1\",\"plans\":[]}", "{\"round\":1,\"plans\":{}}"])
    })
})
