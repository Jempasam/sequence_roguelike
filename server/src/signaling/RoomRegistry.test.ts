import { describe, expect, test } from "vitest"

import { RoomRegistry } from "./RoomRegistry"
import { fakeSession } from "./serverFixtures"

const OPTIONS = { shape: "star", name: "game", capacity: 4 } as const

describe("RoomRegistry", () => {
    test("a room created with no code → made up: six letters of an alphabet with no 0, O, 1 or I", () => {
        const registry = new RoomRegistry()
        for(let attempt = 0; attempt < 50; attempt++){
            const room = registry.create(fakeSession().session, OPTIONS)
            expect(room?.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/)
        }
    })

    test("rooms created → counted, and each found by its code", () => {
        const registry = new RoomRegistry()
        const a = registry.create(fakeSession().session, OPTIONS)
        const b = registry.create(fakeSession().session, OPTIONS)
        expect(registry.size).toBe(2)
        expect(registry.find(a?.code as string)).toBe(a)
        expect(registry.find(b?.code as string)).toBe(b)
        expect(a?.code).not.toBe(b?.code)
    })

    test("a code asked for → the room has it", () => {
        const registry = new RoomRegistry()
        expect(registry.create(fakeSession().session, OPTIONS, "MYROOM")?.code).toBe("MYROOM")
    })

    test("a code asked for that an open room has → none, and the first room stays", () => {
        const registry = new RoomRegistry()
        const first = registry.create(fakeSession().session, OPTIONS, "MYROOM")
        expect(registry.create(fakeSession().session, OPTIONS, "MYROOM")).toBeNull()
        expect(registry.find("MYROOM")).toBe(first)
        expect(registry.size).toBe(1)
    })

    test("the owner of a refused room → not put in it", () => {
        const registry = new RoomRegistry()
        registry.create(fakeSession().session, OPTIONS, "MYROOM")
        const second = fakeSession()
        registry.create(second.session, OPTIONS, "MYROOM")
        expect(second.session.room).toBeNull()
        expect(second.heard).toEqual([])
    })

    test("find → reads the code in any case, and gives none for an unknown code", () => {
        const registry = new RoomRegistry()
        const room = registry.create(fakeSession().session, OPTIONS, "ABC123")
        expect(registry.find("abc123")).toBe(room)
        expect(registry.find("Abc123")).toBe(room)
        expect(registry.find("NOPE")).toBeNull()
        expect(registry.find("")).toBeNull()
    })

    test("a room over → forgotten, and its code may be taken again", () => {
        const registry = new RoomRegistry()
        const owner = fakeSession()
        const room = registry.create(owner.session, OPTIONS, "ABC123")
        room?.leave(owner.session)
        expect(registry.size).toBe(0)
        expect(registry.find("ABC123")).toBeNull()
        expect(registry.create(fakeSession().session, OPTIONS, "ABC123")).not.toBeNull()
    })

    test("a room over → the others stay", () => {
        const registry = new RoomRegistry()
        const owner = fakeSession()
        const gone = registry.create(owner.session, OPTIONS, "AAAAAA")
        const stays = registry.create(fakeSession().session, OPTIONS, "BBBBBB")
        gone?.leave(owner.session)
        expect(registry.find("BBBBBB")).toBe(stays)
        expect(registry.size).toBe(1)
    })

    test("the room made carries what it was given, and its owner is in", () => {
        const registry = new RoomRegistry()
        const owner = fakeSession()
        const room = registry.create(owner.session, { shape: "mesh", name: "x", capacity: 3 })
        expect(room?.options).toMatchObject({ shape: "mesh", name: "x", capacity: 3 })
        expect(owner.session.room).toBe(room)
    })
})
