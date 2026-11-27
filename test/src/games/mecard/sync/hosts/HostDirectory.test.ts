import { Fault } from "@game/core-src/engine/net/Fault"
import { HostDirectory } from "@game/core-src/games/mecard/sync/hosts/HostDirectory"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { nodeNet, signalingOf, startNetServer } from "../../../../fixtures/netServer"
import { REAL_TIMER } from "../../../../fixtures/peerServer"

vi.setConfig({ testTimeout: 30_000 })

const CODES = ["DIR-0", "DIR-1", "DIR-2"]

async function until(condition: () => boolean, what: string): Promise<void> {
    const start = Date.now()
    while(!condition()){
        if(Date.now() - start > 10_000) throw new Error(`Waited too long for ${what}.`)
        await new Promise(resolve => setTimeout(resolve, 10))
    }
}

describe("HostDirectory", () => {
    let server: Awaited<ReturnType<typeof startNetServer>>
    const opened: HostDirectory[] = []

    async function member(beat = 10_000, ttl = 30_000): Promise<HostDirectory> {
        const directory = await HostDirectory.open(nodeNet(), signalingOf(server.url), REAL_TIMER, {
            codes: CODES, beat, ttl,
        })
        if(directory instanceof Fault) throw new Error(directory.describe())
        opened.push(directory)
        return directory
    }

    beforeEach(async() => {
        server = await startNetServer()
    })

    afterEach(async() => {
        for(const directory of opened.splice(0)) directory.dispose()
        await server.close()
    })

    test("a room announced → every member sees it, and retiring takes it out", async() => {
        const first = await member()
        const second = await member()
        second.announce("ROOM", "Ana")
        await until(() => first.hosts.length === 1 && second.hosts.length === 1, "the room to be listed")
        expect(first.hosts[0]).toMatchObject({ code: "ROOM", name: "Ana" })
        second.retire()
        await until(() => first.hosts.length === 0, "the room to be unlisted")
    })

    test("a room that keeps beating stays listed, one that stops falls out", async() => {
        const watcher = await member(50, 400)
        const host = await member(50, 400)
        host.announce("ROOM", "Ana")
        await until(() => watcher.hosts.length === 1, "the room to be listed")
        // Beating: still there after more than the time to live.
        await new Promise(resolve => setTimeout(resolve, 700))
        expect(watcher.hosts.map(entry => entry.code)).toEqual(["ROOM"])
        // Silent, with no retire (a host lost without a word): it falls out once not heard of for too long.
        host.dispose()
        opened.splice(opened.indexOf(host), 1)
        await until(() => watcher.hosts.length === 0, "the silent room to fall out")
    })

    test("the member that holds the list lets go of a silent room and tells the others", async() => {
        // The first member holds the list and sweeps it; the watcher would never drop the room by itself.
        const holder = await member(50, 400)
        const watcher = await member(10_000, 60_000)
        const silent = await member(10_000, 60_000)
        const heard: number[] = []
        watcher.changed.add(hosts => heard.push(hosts.length))
        // Says it stands once, then not before long: it falls out of the list once the time to live passes.
        silent.announce("ROOM", "Ana")
        await until(() => watcher.hosts.length === 1, "the room to be listed")
        await until(() => heard[heard.length - 1] === 0, "the watcher to be told the room fell out")
        expect(watcher.hosts).toEqual([])
        expect(holder.hosts).toEqual([])
    })

    test("a member tells of a change of the list", async() => {
        const first = await member()
        const heard: number[] = []
        first.changed.add(hosts => heard.push(hosts.length))
        first.announce("ROOM", "Ana")
        await until(() => heard.includes(1), "the change to be told")
    })
})
