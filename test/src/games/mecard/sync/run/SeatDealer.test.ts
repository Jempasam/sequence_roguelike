import { FIXED_SEATS, LocalRoom, SEAT_TOPIC, SeatDealer, Seats, readSeatMessage } from "@game/core/mecard/sync"
import type { SeatMode, SyncPeer } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

/** Seats that are plain names, from a list the test changes: no run is needed to give them. */
const NAMED: SeatMode<string[]> = {
    candidates: names => names.map(name => ({ name })),
    seatHost: (seats, names) => seats.seatHost(names),
    enterBattle: seats => seats.clear(),
}

/** A dealer over a room, with the clients that came and what each was told of what it plays. */
function dealing(names = ["a", "b", "c"]) {
    const room = new LocalRoom()
    const seats = new Seats(NAMED, FIXED_SEATS)
    const dealer = new SeatDealer(seats, room)
    const peers = new Map<string, SyncPeer>()
    room.onJoin(peer => peers.set(peer.id, peer))
    const told = new Map<string, (readonly string[])[]>()
    const seated: { id: string, units: readonly string[] }[] = []
    dealer.seated.add(each => seated.push(each))
    /** A client comes to play. */
    const come = (id: string): void => {
        const link = room.join(id)
        const heard: (readonly string[])[] = []
        told.set(id, heard)
        SEAT_TOPIC.link(link).listen(text => {
            const message = readSeatMessage(text)
            if("units" in message) heard.push(message.units)
        })
        dealer.add(peers.get(id) as SyncPeer)
    }
    return { room, seats, dealer, names, told, seated, come }
}

describe("SeatDealer", () => {
    test("a client added → known, and told nothing until something is dealt", () => {
        const { dealer, told, come } = dealing()
        come("p1")
        expect(dealer.has("p1")).toBe(true)
        expect(dealer.guests).toEqual(["p1"])
        expect(told.get("p1")).toEqual([])
    })

    test("guests → in the order they came, and adding twice changes nothing", () => {
        const { dealer, room, told, come } = dealing()
        come("p1")
        come("p2")
        const again = room.join("p1")
        void again
        expect(dealer.guests).toEqual(["p1", "p2"])
        expect(told.get("p1")).toEqual([])
    })

    test("deal → the host is seated first, then each client gets one, and is told its units", () => {
        const { dealer, seats, names, told, seated, come } = dealing()
        come("p1")
        come("p2")
        dealer.deal(names)
        expect(seats.unitsOf("p1")).toHaveLength(1)
        expect(seats.unitsOf("p2")).toHaveLength(1)
        expect(seats.unitsOf("p1")).not.toEqual(seats.unitsOf("p2"))
        expect(told.get("p1")).toEqual([seats.unitsOf("p1")])
        expect(told.get("p2")).toEqual([seats.unitsOf("p2")])
        expect(seated.map(each => each.id)).toEqual(["p1", "p2"])
    })

    test("deal again with nothing changed → nobody is told again", () => {
        const { dealer, names, told, seated, come } = dealing()
        come("p1")
        dealer.deal(names)
        dealer.deal(names)
        expect(told.get("p1")).toHaveLength(1)
        expect(seated).toHaveLength(1)
    })

    test("one seat only, which the host takes → the clients play nothing, and are told nothing", () => {
        const { dealer, seats, names, told, seated, come } = dealing(["a"])
        come("p1")
        come("p2")
        dealer.deal(names)
        expect(seats.unitsOf("p1")).toEqual([])
        expect(seats.unitsOf("p2")).toEqual([])
        expect(told.get("p1")).toEqual([])
        expect(told.get("p2")).toEqual([])
        expect(seated).toEqual([])
    })

    test("a client removed and another coming → the seat goes to the new one, which is told", () => {
        const { dealer, names, told, come } = dealing(["a", "b"])
        come("p1")
        dealer.deal(names)
        expect(told.get("p1")).toEqual([["b"]])
        dealer.remove("p1")
        come("p2")
        dealer.deal(names)
        expect(told.get("p2")).toEqual([["b"]])
    })

    test("a seat that is no longer offered → its client is told it plays nothing now", () => {
        const { dealer, seats, names, told, come } = dealing(["a", "b"])
        come("p1")
        dealer.deal(names)
        names.pop()
        seats.drop("p1")
        dealer.deal(names)
        expect(told.get("p1")).toEqual([["b"], []])
    })

    test("remove → the client is forgotten and what it played is free", () => {
        const { dealer, seats, names, come } = dealing()
        come("p1")
        dealer.deal(names)
        const units = seats.unitsOf("p1")
        dealer.remove("p1")
        expect(dealer.has("p1")).toBe(false)
        expect(seats.unitsOf("p1")).toEqual([])
        expect(seats.holderOf(units[0])).toBeNull()
    })

    test("remove of a stranger → nothing changes", () => {
        const { dealer, seated } = dealing()
        expect(() => dealer.remove("nobody")).not.toThrow()
        expect(seated).toEqual([])
    })

    test("a client coming back → told what it plays again, even when it looks the same", () => {
        const { dealer, room, names, told, come } = dealing()
        come("p1")
        dealer.deal(names)
        room.drop("p1")
        room.back("p1")
        expect(told.get("p1")).toHaveLength(2)
        expect(told.get("p1")?.[1]).toEqual(told.get("p1")?.[0])
        dealer.deal(names)
        expect(told.get("p1")).toHaveLength(2)
    })

    test("a client back that never came to play → not told anything", () => {
        const { room, told } = dealing()
        room.join("watcher")
        room.drop("watcher")
        room.back("watcher")
        expect(told.get("watcher")).toBeUndefined()
    })

    test("dispose → a client coming back is no longer told", () => {
        const { dealer, room, names, told, come } = dealing()
        come("p1")
        dealer.deal(names)
        dealer.dispose()
        room.drop("p1")
        room.back("p1")
        expect(told.get("p1")).toHaveLength(1)
    })
})
