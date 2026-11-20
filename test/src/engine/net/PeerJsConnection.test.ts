import { NetError, PeerJsConnection } from "@game/core"
import type { Cancel, PeerJsRelayed, TimerPort } from "@game/core"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { nodeNet } from "../../fixtures/netServer"
import { REAL_TIMER, startPeerRelay } from "../../fixtures/peerServer"
import type { PeerRelay } from "../../fixtures/peerServer"

let relay: PeerRelay
const opened: PeerJsConnection[] = []

function open(id: string, timer: TimerPort = REAL_TIMER): Promise<PeerJsConnection> {
    const endpoint = `${relay.url.replace("peerjs", "ws")}/peerjs`
    return PeerJsConnection.open({ net: nodeNet(), timer, endpoint, key: "peerjs", id })
}

async function connect(id: string, timer?: TimerPort): Promise<PeerJsConnection> {
    const connection = await open(id, timer)
    opened.push(connection)
    return connection
}

/** A timer that runs nothing by itself, and keeps what is asked of it. */
function manualTimer(): { timer: TimerPort, waits: { ms: number, isCancelled: boolean }[] } {
    const waits: { ms: number, isCancelled: boolean }[] = []
    const timer: TimerPort = {
        after: (ms): Cancel => {
            const wait = { ms, isCancelled: false }
            waits.push(wait)
            return { cancel: () => { wait.isCancelled = true } }
        },
        now: () => Date.now(),
    }
    return { timer, waits }
}

beforeEach(async() => {
    relay = await startPeerRelay({ expire_timeout: 300 })
})

afterEach(async() => {
    for(const connection of opened.splice(0)) connection.close()
    await relay.close()
})

describe("PeerJsConnection", () => {

    test("is open once the server accepted the id", async() => {
        const connection = await connect("TEST-A")
        expect(connection.id).toBe("TEST-A")
        expect(connection.state).toBe("open")
    })

    test("refuses an id another client holds, with a taken error", async() => {
        await connect("TEST-A")
        const error = await open("TEST-A").catch((fault: unknown) => fault)
        expect(error).toBeInstanceOf(NetError)
        expect((error as NetError).reason).toBe("taken")
    })

    test("is told who a relayed message is from", async() => {
        const first = await connect("TEST-A")
        const second = await connect("TEST-B")
        const heard: PeerJsRelayed[] = []
        second.onMessage(message => heard.push(message))
        first.send("OFFER", "TEST-B", { k: "hello" })
        while(heard.length === 0) await new Promise(resolve => setTimeout(resolve, 5))
        expect(heard[0]).toMatchObject({ type: "OFFER", from: "TEST-A", payload: { k: "hello" } })
    })

    test("fills what a server of PeerJS asks of an offer, an answer and a candidate, and keeps what it says", async() => {
        const first = await connect("TEST-A")
        const second = await connect("TEST-B")
        const heard: PeerJsRelayed[] = []
        second.onMessage(message => heard.push(message))
        first.send("OFFER", "TEST-B", { k: "knock" })
        first.send("ANSWER", "TEST-B", { k: "admit" })
        first.send("CANDIDATE", "TEST-B", { k: "signal" })
        while(heard.length < 3) await new Promise(resolve => setTimeout(resolve, 5))
        const [offer, answer, candidate] = heard.map(message => message.payload as Record<string, unknown>)
        expect(offer).toMatchObject({ k: "knock", type: "data", label: "game", serialization: "json", sdp: { type: "offer", sdp: "v=0\r\n" } })
        expect(answer).toMatchObject({ k: "admit", type: "data", sdp: { type: "answer", sdp: "v=0\r\n" } })
        expect(candidate).toMatchObject({ k: "signal", type: "data", candidate: { candidate: "" } })
        for(const payload of [offer, answer, candidate]) expect(typeof payload?.connectionId).toBe("string")
    })

    test("is told when what it sent to an absent id expired", async() => {
        const connection = await connect("TEST-A")
        const heard: PeerJsRelayed[] = []
        connection.onMessage(message => heard.push(message))
        connection.send("OFFER", "TEST-NOBODY", { k: "hello" })
        while(heard.length === 0) await new Promise(resolve => setTimeout(resolve, 5))
        expect(heard[0]).toMatchObject({ type: "EXPIRE", from: "TEST-NOBODY" })
    })

    test("keeps beating every 5 seconds until it is closed", async() => {
        const { timer, waits } = manualTimer()
        const connection = await connect("TEST-A", timer)
        expect(waits.map(wait => wait.ms)).toEqual([5_000])
        connection.close()
        await new Promise(resolve => setTimeout(resolve, 20))
        expect(waits.every(wait => wait.isCancelled)).toBe(true)
    })

    test("tells its end to the ones that listen, even late", async() => {
        const connection = await connect("TEST-A")
        const early: NetError[] = []
        connection.onClose(reason => early.push(reason))
        connection.close()
        while(early.length === 0) await new Promise(resolve => setTimeout(resolve, 5))
        expect(early[0]?.reason).toBe("closed")
        const late = await new Promise<NetError>(resolve => connection.onClose(resolve))
        expect(late.reason).toBe("closed")
        expect(connection.state).toBe("closed")
    })

    test("tells the reason of this end when it closes for one", async() => {
        const connection = await connect("TEST-A")
        const ended = new Promise<NetError>(resolve => connection.onClose(resolve))
        connection.closeFor(new NetError("refused", "Out."))
        expect((await ended).reason).toBe("refused")
    })
})
