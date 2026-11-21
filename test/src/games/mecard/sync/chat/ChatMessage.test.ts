import { HUE_TURN, readChatMessage, wrapHue, writeChatMessage } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { expectNoneOf } from "../messageFixtures"

describe("Chat message", () => {
    test("written → read back the same", () => {
        const message = { author: { name: "Ana", hue: 120 }, text: "hello" }
        expect(readChatMessage(writeChatMessage(message))).toEqual(message)
    })

    test("empty text → still a message", () => {
        const message = { author: { name: "Ana", hue: 0 }, text: "" }
        expect(readChatMessage(writeChatMessage(message))).toEqual(message)
    })

    test("hue out of the circle → brought back in", () => {
        const read = readChatMessage(writeChatMessage({ author: { name: "A", hue: 370 }, text: "x" }))
        expect(read).toEqual({ author: { name: "A", hue: 10 }, text: "x" })
        const negative = readChatMessage(writeChatMessage({ author: { name: "A", hue: -10 }, text: "x" }))
        expect(negative).toEqual({ author: { name: "A", hue: 350 }, text: "x" })
    })

    test("not a message → unreadable", () => {
        expectNoneOf(readChatMessage, [
            "{}",
            "{\"text\":\"x\"}",
            "{\"author\":{\"name\":\"a\",\"hue\":1}}",
            "{\"author\":{\"name\":\"a\"},\"text\":\"x\"}",
            "{\"author\":{\"hue\":1},\"text\":\"x\"}",
            "{\"author\":{\"name\":1,\"hue\":1},\"text\":\"x\"}",
            "{\"author\":{\"name\":\"a\",\"hue\":\"1\"},\"text\":\"x\"}",
            "{\"author\":null,\"text\":\"x\"}",
            "{\"author\":{\"name\":\"a\",\"hue\":1},\"text\":5}",
        ])
    })

    test("extra fields → left out", () => {
        const text = JSON.stringify({ author: { name: "A", hue: 1, extra: 1 }, text: "x", more: 2 })
        expect(readChatMessage(text)).toEqual({ author: { name: "A", hue: 1 }, text: "x" })
    })
})

describe("wrapHue", () => {
    test.each([
        [0, 0], [359, 359], [HUE_TURN, 0], [HUE_TURN + 1, 1], [-1, 359], [-HUE_TURN, 0], [725, 5],
    ])("%d → %d", (hue, expected) => {
        expect(wrapHue(hue)).toBe(expected)
    })
})
