import type { Fault } from "@game/core"
import {
    LocalRoom, LocalSync, SEAT_OFFER_TOPIC, SEAT_RELEASE_TOPIC, SEAT_TAKE_TOPIC, SeatPicker, UnreadableFault,
    readSeatWishMessage, writeSeatOfferMessage,
} from "@game/core/mecard/sync"
import type { SeatOffer, SyncPeer } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

/** A picker, the channel the host offers on, and what the host hears of the client on its side. */
function picking() {
    const room = new LocalRoom()
    const peers: SyncPeer[] = []
    room.onJoin(peer => peers.push(peer))
    const link = room.join("p1")
    const channel = new LocalSync()
    const picker = new SeatPicker(link, channel)
    const offers: SeatOffer[] = []
    const faults: Fault[] = []
    picker.offered.add(offer => offers.push(offer))
    picker.faulted.add(fault => faults.push(fault))
    const host: string[] = []
    peers[0].listen(message => host.push(message))
    const offer = (value: SeatOffer): void => {
        SEAT_OFFER_TOPIC.sender(channel).send(writeSeatOfferMessage(value))
    }
    return { picker, channel, offers, faults, host, offer }
}

describe("SeatPicker", () => {
    test("no offer yet → none", () => {
        expect(picking().picker.offer).toBeNull()
    })

    test("an offer → kept, and told", () => {
        const { picker, offers, offer } = picking()
        const value = { candidates: ["a"], held: { b: "p2" } }
        offer(value)
        expect(picker.offer).toEqual(value)
        expect(offers).toEqual([value])
    })

    test("a newer offer → replaces the last", () => {
        const { picker, offer } = picking()
        offer({ candidates: ["a"], held: {} })
        offer({ candidates: [], held: { a: "p1" } })
        expect(picker.offer).toEqual({ candidates: [], held: { a: "p1" } })
    })

    test("an offer that cannot be read → faulted, left out, and the last offer is kept", () => {
        const { picker, channel, offers, faults, offer } = picking()
        offer({ candidates: ["a"], held: {} })
        SEAT_OFFER_TOPIC.sender(channel).send("nonsense")
        expect(faults).toHaveLength(1)
        expect(faults[0]).toBeInstanceOf(UnreadableFault)
        expect(offers).toHaveLength(1)
        expect(picker.offer).toEqual({ candidates: ["a"], held: {} })
    })

    test("a message of another topic → not heard as an offer", () => {
        const { picker, channel, offers, faults } = picking()
        channel.send("other:{}")
        expect(offers).toEqual([])
        expect(faults).toEqual([])
        expect(picker.offer).toBeNull()
    })

    test("take → the host hears a wish on the take topic", () => {
        const { picker, host } = picking()
        picker.take("knight")
        expect(host).toHaveLength(1)
        expect(host[0].startsWith(`${SEAT_TAKE_TOPIC.name}:`)).toBe(true)
        expect(readSeatWishMessage(SEAT_TAKE_TOPIC, host[0].slice(SEAT_TAKE_TOPIC.name.length + 1))).toEqual({ unit: "knight" })
    })

    test("release → the host hears a wish on the release topic, apart from the take topic", () => {
        const { picker, host } = picking()
        picker.release("knight")
        expect(host).toHaveLength(1)
        expect(host[0].startsWith(`${SEAT_RELEASE_TOPIC.name}:`)).toBe(true)
        expect(host[0].startsWith(`${SEAT_TAKE_TOPIC.name}:`)).toBe(false)
    })

    test("dispose → no more offers are heard, but wishes can still be sent", () => {
        const { picker, offers, offer, host } = picking()
        picker.dispose()
        offer({ candidates: [], held: {} })
        expect(offers).toEqual([])
        picker.take("a")
        expect(host).toHaveLength(1)
    })
})
