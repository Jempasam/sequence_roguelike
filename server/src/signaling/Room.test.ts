import { describe, expect, test, vi } from "vitest"

import type { RoomShape } from "../protocol"
import { Room } from "./Room"
import { deadSession, fakeSession, heardOf } from "./serverFixtures"
import type { FakeSession } from "./serverFixtures"

/** A room owned by a new session, and how many times it said it is over. */
function open(shape: RoomShape = "star", capacity = 4) {
    const owner = fakeSession()
    let over = 0
    const room = new Room({ code: "ABCDEF", shape, name: "game", capacity }, owner.session, () => over++)
    return { room, owner, over: () => over }
}

/** A session knocking at the room, and let in by its owner. */
function enter(room: Room, owner: FakeSession, data: Parameters<Room["setData"]>[1] = null): FakeSession {
    const guest = fakeSession()
    guest.session.data = data
    room.knock(guest.session)
    room.admit(owner.session, guest.session.id, true)
    return guest
}

describe("Room, creating", () => {
    test("the owner is told it entered, alone, as the owner of the room", () => {
        const { owner } = open()
        const [entered] = heardOf(owner, "entered")
        expect(entered).toMatchObject({ code: "ABCDEF", name: "game", shape: "star", owner: owner.session.id, members: [] })
        expect(entered.self.id).toBe(owner.session.id)
        expect(owner.session.room).not.toBeNull()
    })

    test("code and size → the code it was given, and one member", () => {
        const { room } = open()
        expect(room.code).toBe("ABCDEF")
        expect(room.size).toBe(1)
    })
})

describe("Room, knocking and admitting", () => {
    test("knock → the owner hears of it, and the newcomer is not yet in", () => {
        const { room, owner } = open()
        const guest = fakeSession()
        guest.session.data = { name: "Bo" }
        room.knock(guest.session)
        expect(heardOf(owner, "knocking")).toEqual([{ type: "knocking", member: { id: guest.session.id, data: { name: "Bo" } } }])
        expect(heardOf(guest, "entered")).toEqual([])
        expect(guest.session.room).toBe(room)
    })

    test("knock never answered → refused after the delay, the place freed, the owner told it left", () => {
        vi.useFakeTimers()
        try {
            const owner = fakeSession()
            const room = new Room({ code: "ABCDEF", shape: "star", name: "game", capacity: 2, knockMs: 1000 }, owner.session, () => {})
            const guest = fakeSession()
            room.knock(guest.session)
            expect(room.size).toBe(2)
            vi.advanceTimersByTime(1001)
            expect(heardOf(guest, "refused")).toEqual([{ type: "refused", reason: "refused" }])
            expect(heardOf(owner, "left")).toEqual([{ type: "left", member: guest.session.id }])
            expect(guest.session.room).toBeNull()
            expect(room.size).toBe(1)
        } finally {
            vi.useRealTimers()
        }
    })

    test("knock answered in time → no refusal comes after", () => {
        vi.useFakeTimers()
        try {
            const owner = fakeSession()
            const room = new Room({ code: "ABCDEF", shape: "star", name: "game", capacity: 2, knockMs: 1000 }, owner.session, () => {})
            const guest = fakeSession()
            room.knock(guest.session)
            room.admit(owner.session, guest.session.id, true)
            vi.advanceTimersByTime(5000)
            expect(heardOf(guest, "refused")).toEqual([])
            expect(room.size).toBe(2)
        } finally {
            vi.useRealTimers()
        }
    })

    test("the newcomer waiting counts toward the size", () => {
        const { room } = open()
        room.knock(fakeSession().session)
        expect(room.size).toBe(2)
    })

    test("admit accepted → the newcomer is told it entered, with the owner, and the members hear it joined", () => {
        const { room, owner } = open()
        const guest = enter(room, owner, { n: 1 })
        const [entered] = heardOf(guest, "entered")
        expect(entered.owner).toBe(owner.session.id)
        expect(entered.members.map(member => member.id)).toEqual([owner.session.id])
        expect(entered.self).toEqual({ id: guest.session.id, data: { n: 1 } })
        expect(heardOf(owner, "joined")).toEqual([{ type: "joined", member: { id: guest.session.id, data: { n: 1 } } }])
    })

    test("admit refused → the newcomer is told so and is out of the room, and the owner hears no join", () => {
        const { room, owner } = open()
        const guest = fakeSession()
        room.knock(guest.session)
        room.admit(owner.session, guest.session.id, false)
        expect(heardOf(guest, "refused")).toEqual([{ type: "refused", reason: "refused" }])
        expect(guest.session.room).toBeNull()
        expect(heardOf(owner, "joined")).toEqual([])
        expect(room.size).toBe(1)
    })

    test("admit by a member that is not the owner → an error", () => {
        const { room, owner } = open()
        const guest = enter(room, owner)
        const another = fakeSession()
        room.knock(another.session)
        expect(() => room.admit(guest.session, another.session.id, true)).toThrow(/owner/)
    })

    test("admit of an id nobody knocked with → nothing happens", () => {
        const { room, owner } = open()
        expect(() => room.admit(owner.session, "nobody", true)).not.toThrow()
        expect(room.size).toBe(1)
    })

    test("admit twice for the same newcomer → let in once", () => {
        const { room, owner } = open()
        const guest = fakeSession()
        room.knock(guest.session)
        room.admit(owner.session, guest.session.id, true)
        room.admit(owner.session, guest.session.id, true)
        expect(heardOf(guest, "entered")).toHaveLength(1)
        expect(room.size).toBe(2)
    })

    test("a room that is full → the newcomer is refused at once, and the owner is not bothered", () => {
        const { room, owner } = open("star", 2)
        enter(room, owner)
        const late = fakeSession()
        room.knock(late.session)
        expect(heardOf(late, "refused")).toEqual([{ type: "refused", reason: "full" }])
        expect(heardOf(owner, "knocking")).toHaveLength(1)
        expect(late.session.room).toBeNull()
    })

    test("a newcomer waiting takes a place: the room full counts those at the door", () => {
        const { room } = open("star", 2)
        room.knock(fakeSession().session)
        const late = fakeSession()
        room.knock(late.session)
        expect(heardOf(late, "refused")).toEqual([{ type: "refused", reason: "full" }])
    })

    test("a newcomer that left between its knock and the answer → the owner was told, and no one is let in", () => {
        const { room, owner } = open()
        const guest = fakeSession()
        room.knock(guest.session)
        room.leave(guest.session)
        expect(heardOf(owner, "left")).toEqual([{ type: "left", member: guest.session.id }])
        room.admit(owner.session, guest.session.id, true)
        expect(heardOf(guest, "entered")).toEqual([])
        expect(room.size).toBe(1)
    })

    test("in a star, a member is told of the owner only, and not of the others", () => {
        const { room, owner } = open("star")
        const a = enter(room, owner)
        const b = enter(room, owner)
        expect(heardOf(b, "entered")[0].members.map(member => member.id)).toEqual([owner.session.id])
        expect(heardOf(a, "joined")).toEqual([])
    })

    test("in a mesh, a member is told of everyone, and everyone hears it join", () => {
        const { room, owner } = open("mesh")
        const a = enter(room, owner)
        const b = enter(room, owner)
        expect(heardOf(b, "entered")[0].members.map(member => member.id)).toEqual([owner.session.id, a.session.id])
        expect(heardOf(a, "joined").map(each => each.member.id)).toEqual([b.session.id])
    })
})

describe("Room, setData", () => {
    test("a member changing its data → the members linked to it hear it, not itself", () => {
        const { room, owner } = open()
        const guest = enter(room, owner)
        room.setData(guest.session, { mood: "happy" })
        expect(heardOf(owner, "changed")).toEqual([{ type: "changed", member: { id: guest.session.id, data: { mood: "happy" } } }])
        expect(heardOf(guest, "changed")).toEqual([])
    })

    test("in a star, the others do not hear of a change between two members", () => {
        const { room, owner } = open("star")
        const a = enter(room, owner)
        const b = enter(room, owner)
        room.setData(a.session, 1)
        expect(heardOf(b, "changed")).toEqual([])
    })

    test("in a mesh, every other member hears it", () => {
        const { room, owner } = open("mesh")
        const a = enter(room, owner)
        const b = enter(room, owner)
        room.setData(a.session, 1)
        expect(heardOf(b, "changed")).toHaveLength(1)
        expect(heardOf(owner, "changed")).toHaveLength(1)
    })

    test("a newcomer still at the door changing its data → kept for when it is let in, and no one is told", () => {
        const { room, owner } = open()
        const guest = fakeSession()
        room.knock(guest.session)
        room.setData(guest.session, "later")
        expect(heardOf(owner, "changed")).toEqual([])
        room.admit(owner.session, guest.session.id, true)
        expect(heardOf(guest, "entered")[0].self.data).toBe("later")
    })
})

describe("Room, relay", () => {
    test("between linked members → the target hears who it is from", () => {
        const { room, owner } = open()
        const guest = enter(room, owner)
        const signal = { kind: "description", type: "offer", sdp: "x" } as const
        room.relay(guest.session, owner.session.id, signal)
        expect(heardOf(owner, "signal")).toEqual([{ type: "signal", from: guest.session.id, signal }])
    })

    test("in a star, two members that are not linked → an error, nothing is passed", () => {
        const { room, owner } = open("star")
        const a = enter(room, owner)
        const b = enter(room, owner)
        const signal = { kind: "candidate", candidate: "c", sdpMid: null, sdpMLineIndex: null } as const
        expect(() => room.relay(a.session, b.session.id, signal)).toThrow()
        expect(heardOf(b, "signal")).toEqual([])
    })

    test("in a mesh, two members → linked", () => {
        const { room, owner } = open("mesh")
        const a = enter(room, owner)
        const b = enter(room, owner)
        room.relay(a.session, b.session.id, { kind: "candidate", candidate: "c", sdpMid: null, sdpMLineIndex: null })
        expect(heardOf(b, "signal")).toHaveLength(1)
    })

    test("to a member that does not exist, or to a newcomer still at the door → an error", () => {
        const { room, owner } = open()
        const signal = { kind: "description", type: "answer", sdp: "x" } as const
        expect(() => room.relay(owner.session, "nobody", signal)).toThrow()
        const waiting = fakeSession()
        room.knock(waiting.session)
        expect(() => room.relay(owner.session, waiting.session.id, signal)).toThrow()
    })

    test("from a session that is not a member → an error", () => {
        const { room, owner } = open()
        const outsider = fakeSession()
        const signal = { kind: "description", type: "offer", sdp: "x" } as const
        expect(() => room.relay(outsider.session, owner.session.id, signal)).toThrow()
    })

    test("to a member whose socket is closed → dropped without a throw", () => {
        const { room, owner } = open("mesh")
        const gone = deadSession()
        room.knock(gone.session)
        room.admit(owner.session, gone.session.id, true)
        const signal = { kind: "description", type: "offer", sdp: "x" } as const
        expect(() => room.relay(owner.session, gone.session.id, signal)).not.toThrow()
        expect(gone.heard).toEqual([])
    })
})

describe("Room, leaving in a star", () => {
    test("a member leaving → the owner hears it, the room goes on", () => {
        const { room, owner, over } = open("star")
        const guest = enter(room, owner)
        room.leave(guest.session)
        expect(heardOf(owner, "left")).toEqual([{ type: "left", member: guest.session.id }])
        expect(guest.session.room).toBeNull()
        expect(over()).toBe(0)
        expect(room.size).toBe(1)
    })

    test("the owner leaving → the room closes: members hear closed, those at the door are refused as closed", () => {
        const { room, owner, over } = open("star")
        const member = enter(room, owner)
        const door = fakeSession()
        room.knock(door.session)
        room.leave(owner.session)
        expect(heardOf(member, "closed")).toHaveLength(1)
        expect(heardOf(door, "refused")).toEqual([{ type: "refused", reason: "closed" }])
        expect(member.session.room).toBeNull()
        expect(door.session.room).toBeNull()
        expect(over()).toBe(1)
    })

    test("leaving twice → told once", () => {
        const { room, owner } = open("star")
        const guest = enter(room, owner)
        room.leave(guest.session)
        room.leave(guest.session)
        expect(heardOf(owner, "left")).toHaveLength(1)
    })

    test("a session that never was in → leaving changes nothing", () => {
        const { room, owner, over } = open("star")
        room.leave(fakeSession().session)
        expect(heardOf(owner, "left")).toEqual([])
        expect(over()).toBe(0)
    })

    test("a room closed → once, even when everyone then leaves", () => {
        const { room, owner, over } = open("star")
        const member = enter(room, owner)
        room.leave(owner.session)
        room.leave(member.session)
        expect(over()).toBe(1)
    })
})

describe("Room, leaving in a mesh", () => {
    test("a member leaving → every other member hears it, the room goes on", () => {
        const { room, owner, over } = open("mesh")
        const a = enter(room, owner)
        const b = enter(room, owner)
        room.leave(a.session)
        expect(heardOf(owner, "left")).toEqual([{ type: "left", member: a.session.id }])
        expect(heardOf(b, "left")).toEqual([{ type: "left", member: a.session.id }])
        expect(over()).toBe(0)
    })

    test("the owner leaving → the oldest member becomes the owner and all remaining are told", () => {
        const { room, owner, over } = open("mesh")
        const a = enter(room, owner)
        const b = enter(room, owner)
        room.leave(owner.session)
        expect(heardOf(a, "owner")).toEqual([{ type: "owner", member: a.session.id }])
        expect(heardOf(b, "owner")).toEqual([{ type: "owner", member: a.session.id }])
        expect(heardOf(a, "closed")).toEqual([])
        expect(over()).toBe(0)
    })

    test("the new owner → is asked about those still at the door, and can admit them", () => {
        const { room, owner } = open("mesh")
        const a = enter(room, owner)
        const door = fakeSession()
        room.knock(door.session)
        room.leave(owner.session)
        expect(heardOf(a, "knocking").map(each => each.member.id)).toEqual([door.session.id])
        room.admit(a.session, door.session.id, true)
        expect(heardOf(door, "entered")).toHaveLength(1)
    })

    test("the old owner → can no longer admit", () => {
        const { room, owner } = open("mesh")
        enter(room, owner)
        const door = fakeSession()
        room.knock(door.session)
        room.leave(owner.session)
        expect(() => room.admit(owner.session, door.session.id, true)).toThrow()
    })

    test("the last member leaving → the room is over", () => {
        const { room, owner, over } = open("mesh")
        const a = enter(room, owner)
        room.leave(owner.session)
        room.leave(a.session)
        expect(over()).toBe(1)
    })

    test("the only member leaving while someone is at the door → the one at the door is refused as closed", () => {
        const { room, owner, over } = open("mesh")
        const door = fakeSession()
        room.knock(door.session)
        room.leave(owner.session)
        expect(heardOf(door, "refused")).toEqual([{ type: "refused", reason: "closed" }])
        expect(over()).toBe(1)
    })
})
