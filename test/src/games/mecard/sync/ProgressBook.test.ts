import type { Fault } from "@game/core"
import {
    LAST_STATE, LocalRoom, LocalSync, ProgressBook, ProgressReceiver, PROGRESS_TOPIC, Relay,
    writeProgressMessage,
} from "@game/core/mecard/sync"
import type { Progress } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

// --- Fixture builders ---

function progress(depth: number): Progress {
    return { floor: 1, depth, layer: depth, atDuel: false, inBattle: false, inHalt: false }
}

function booked() {
    const room = new LocalRoom()
    const channel = new LocalSync()
    const relay = new Relay(PROGRESS_TOPIC, room, channel, LAST_STATE)
    const book = new ProgressBook(relay)
    const told: string[] = []
    const faults: Fault[] = []
    book.progressed.add(({ id, progress: each }) => told.push(`${id}:${each.depth}`))
    book.faulted.add(fault => faults.push(fault))
    return { room, channel, relay, book, told, faults }
}

// --- Tests ---

describe("ProgressBook", () => {
    test("a client saying where it stands → kept and told, with its id", () => {
        const { room, book, told } = booked()
        PROGRESS_TOPIC.link(room.join("a")).send(writeProgressMessage(progress(3)))
        expect(book.progressOf("a")).toEqual(progress(3))
        expect(told).toEqual(["a:3"])
    })

    test("a player the hub stands for → kept as any other, and heard by the clients", () => {
        const { relay, channel, book } = booked()
        const heard = new ProgressReceiver(channel)
        relay.sendAs("hub", writeProgressMessage(progress(2)))
        expect(book.progressOf("hub")).toEqual(progress(2))
        expect(heard.progressOf("hub")).toEqual(progress(2))
    })

    test("only the last progress of a player → kept", () => {
        const { room, book, told } = booked()
        const link = PROGRESS_TOPIC.link(room.join("a"))
        link.send(writeProgressMessage(progress(1)))
        link.send(writeProgressMessage(progress(2)))
        expect(book.progressOf("a")?.depth).toBe(2)
        expect(told).toEqual(["a:1", "a:2"])
        expect(book.players).toEqual(["a"])
    })

    test("a player not heard of → none", () => {
        const { book } = booked()
        expect(book.progressOf("nobody")).toBeNull()
    })

    test("a message that cannot be read → told as a fault, and the last progress kept", () => {
        const { room, book, faults } = booked()
        const link = PROGRESS_TOPIC.link(room.join("a"))
        link.send(writeProgressMessage(progress(1)))
        link.send("nonsense")
        expect(faults).toHaveLength(1)
        expect(book.progressOf("a")?.depth).toBe(1)
    })

    test("disposed → nothing more is kept", () => {
        const { room, book } = booked()
        book.dispose()
        PROGRESS_TOPIC.link(room.join("a")).send(writeProgressMessage(progress(1)))
        expect(book.progressOf("a")).toBeNull()
    })
})
