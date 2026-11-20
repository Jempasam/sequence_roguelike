import { signalingAt } from "@game/core"
import { describe, expect, test } from "vitest"

import { nodeNet } from "../../fixtures/netServer"
import { REAL_TIMER } from "../../fixtures/peerServer"

describe("signalingAt", () => {
    test("an address no signaling answers to → the connector fails, saying which schemes are known", async() => {
        const connect = signalingAt(nodeNet(), REAL_TIMER, "http://127.0.0.1:1")
        await expect(connect()).rejects.toThrow(/ws:\/\/, wss:\/\/, peerjs:\/\/ or peerjss:\/\//)
    })

    test("a peerjs address → a signaling made without reaching the network at once", async() => {
        const connect = signalingAt(nodeNet(), REAL_TIMER, "peerjs://127.0.0.1:1")
        await expect(connect()).resolves.toMatchObject({ iceServers: expect.any(Array) })
    })
})
