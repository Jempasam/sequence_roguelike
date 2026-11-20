import { PTPHostSocket, PTPSharedSocket } from "@game/core"
import type { SharedOptions } from "@game/core"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { nodeNet, signalingOf, startNetServer } from "../../fixtures/netServer"
import { REAL_TIMER, startPeerRelay } from "../../fixtures/peerServer"

// --- Fixture builders ---

/** A signaling to meet through: the game server or the relay of PeerJS, started and stopped for each test. */
interface Backend {
    readonly url: string
    close(): Promise<void>
}

const BACKENDS: readonly (readonly [string, () => Promise<Backend>])[] = [
    ["game server", async() => {
        const server = await startNetServer()
        return { url: server.url, close: () => server.close() }
    }],
    ["PeerJS relay", async() => {
        // A short wait for a message to an id nobody holds, so a knock on an empty room is answered soon.
        const relay = await startPeerRelay({ expire_timeout: 300 })
        return { url: `${relay.url}?prefix=shared&stun=`, close: () => relay.close() }
    }],
]

/** The value of the tests: the changes taken in, in order. */
type Log = number[]

type Extra = Partial<SharedOptions<Log, number>>
type Shared = PTPSharedSocket<Log, number>

const FAST = { openTimeout: 1_500, retryDelay: 100, probeInterval: 0 }

const opened: { close(): void }[] = []

// Real connections, and waits for rooms that never answer.
vi.setConfig({ testTimeout: 40_000 })

async function until(condition: () => boolean, what = "the condition"): Promise<void> {
    const start = Date.now()
    while(!condition()){
        if(Date.now() - start > 15_000) throw new Error(`Waited too long for ${what}.`)
        await new Promise(resolve => setTimeout(resolve, 10))
    }
}

describe.each(BACKENDS)("PTPSharedSocket over the %s", (_name, start) => {
    let backend: Backend

    function options(codes: readonly string[], extra: Extra = {}): SharedOptions<Log, number> {
        return {
            codes, factory: () => [], accumulate: (log, change) => [...log, change], timer: REAL_TIMER,
            ...FAST, ...extra,
        }
    }

    async function member(codes: readonly string[], extra: Extra = {}): Promise<Shared> {
        const socket = await PTPSharedSocket.open(nodeNet(), signalingOf(backend.url), options(codes, extra))
        opened.push(socket)
        return socket
    }

    beforeEach(async() => {
        backend = await start()
    })

    afterEach(async() => {
        for(const socket of opened.splice(0)) socket.close()
        await backend.close()
    })

    test("alone → hosts the value the factory makes", async() => {
        const alone = await member(["HUB-0", "HUB-1", "HUB-2"])
        expect(alone.isHost).toBe(true)
        expect(alone.code).toBe("HUB-0")
        expect(alone.value).toEqual([])
    })

    test("second member → client of the first, hears its value; changes go both ways", async() => {
        const codes = ["HUB-0", "HUB-1", "HUB-2"]
        const first = await member(codes)
        first.send(1)
        const second = await member(codes)
        expect(second.role).toBe("client")
        expect(second.value).toEqual([1])
        second.send(2)
        await until(() => first.value.length === 2 && second.value.length === 2, "the change of the client")
        expect(first.value).toEqual([1, 2])
        expect(second.value).toEqual([1, 2])
        first.send(3)
        await until(() => second.value.length === 3, "the change of the host")
        expect(second.value).toEqual([1, 2, 3])
        expect(second.pending).toBe(0)
    })

    test("the accumulator is called on the host only, and what it throws on is dropped", async() => {
        const codes = ["HUB-0", "HUB-1", "HUB-2"]
        const accumulated: number[] = []
        const accumulate = (log: Log, change: number): Log => {
            accumulated.push(change)
            if(change < 0) throw new Error("No.")
            return [...log, change]
        }
        const first = await member(codes, { accumulate })
        const second = await member(codes, { accumulate })
        second.send(-1)
        second.send(5)
        await until(() => first.value.length === 1 && second.value.length === 1, "the good change")
        expect(second.value).toEqual([5])
        expect(accumulated).toEqual([-1, 5])
        expect(second.pending).toBe(0)
    })

    test("the host is lost → a client hosts the last value, and changes sent meanwhile are taken in once", async() => {
        const codes = ["HUB-0", "HUB-1", "HUB-2"]
        const first = await member(codes)
        const second = await member(codes)
        const third = await member(codes)
        first.send(1)
        await until(() => second.value.length === 1 && third.value.length === 1, "the first change")
        first.close()
        second.send(2)
        third.send(3)
        await until(() => second.value.length === 3 && third.value.length === 3, "the new host to take the changes in")
        expect([...second.value].sort()).toEqual([1, 2, 3])
        expect(second.value).toEqual(third.value)
        expect([second.isHost, third.isHost].filter(Boolean)).toHaveLength(1)
        expect(second.pending).toBe(0)
        expect(third.pending).toBe(0)
    })

    test("a room that is full → the next code takes the others in", async() => {
        const codes = ["HUB-0", "HUB-1", "HUB-2"]
        const first = await member(codes, { capacity: 2 })
        const second = await member(codes, { capacity: 2 })
        const third = await member(codes, { capacity: 2 })
        expect(first.code).toBe("HUB-0")
        expect(second.code).toBe("HUB-0")
        expect(third.code).toBe("HUB-1")
        expect(third.isHost).toBe(true)
    })

    test("a room that never answers → the member goes on to the next code, and comes back to the first when it is served", async() => {
        const codes = ["HUB-0", "HUB-1", "HUB-2"]
        // Whoever holds the first code and tells no value: a host that is lost without a word.
        const squatter = await PTPHostSocket.open(nodeNet(), signalingOf(backend.url), { name: "squat", code: "HUB-0", timer: REAL_TIMER })
        const stray = await member(codes, { probeInterval: 150 })
        expect(stray.code).toBe("HUB-1")
        expect(stray.isHost).toBe(true)
        stray.send(9)
        squatter.close()
        // The signaling frees the code when it sees the squatter's socket close, which may be a moment later.
        await new Promise(resolve => setTimeout(resolve, 300))
        const first = await member(codes, { probeInterval: 150 })
        expect(first.code).toBe("HUB-0")
        expect(first.isHost).toBe(true)
        await until(() => stray.code === "HUB-0" && stray.role === "client", "the stray member to come back to the first code")
        expect(stray.value).toEqual([])
        expect(stray.pending).toBe(0)
    })

    test("no code leads to a room → open fails", async() => {
        // Every code is held by a room that says nothing.
        const squatters = await Promise.all(["HUB-0", "HUB-1"].map(code =>
            PTPHostSocket.open(nodeNet(), signalingOf(backend.url), { name: "squat", code, timer: REAL_TIMER })))
        opened.push(...squatters)
        await expect(PTPSharedSocket.open(nodeNet(), signalingOf(backend.url), options(["HUB-0", "HUB-1"]))).rejects.toThrow()
    })
})
