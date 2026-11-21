import { describe, expect, test } from "vitest"

import {
    MAX_CAPACITY, MAX_CODE_LENGTH, MAX_DATA_LENGTH, MAX_MESSAGE_LENGTH, MAX_NAME_LENGTH, ProtocolError,
    readClientMessage, readServerMessage, writeMessage,
} from "./codec"
import type { ClientMessage, PeerSignal, ServerMessage } from "./messages"

const OFFER: PeerSignal = { kind: "description", type: "offer", sdp: "v=0" }
const CANDIDATE: PeerSignal = { kind: "candidate", candidate: "candidate:1", sdpMid: "0", sdpMLineIndex: 0 }
const MEMBER = { id: "abc", data: { name: "Ana" } }

const CLIENT_MESSAGES: readonly ClientMessage[] = [
    { type: "hello", version: 2 },
    { type: "create", shape: "star", name: "game", data: { a: 1 }, capacity: 4 },
    { type: "create", shape: "mesh", name: "game", data: null, capacity: 2, code: "ABC-12" },
    { type: "join", code: "ABCDEF", data: "hi" },
    { type: "admit", member: "abc", accepted: true },
    { type: "admit", member: "abc", accepted: false },
    { type: "setData", data: [1, 2, { x: null }] },
    { type: "signal", to: "abc", signal: OFFER },
    { type: "signal", to: "abc", signal: CANDIDATE },
]

const SERVER_MESSAGES: readonly ServerMessage[] = [
    { type: "welcome", iceServers: [] },
    { type: "welcome", iceServers: [{ urls: ["stun:a:1"] }, { urls: ["turn:a:1"], username: "u", credential: "c" }] },
    { type: "entered", code: "ABCDEF", name: "game", shape: "star", self: MEMBER, owner: "abc", members: [MEMBER] },
    { type: "refused", reason: "not-found" },
    { type: "refused", reason: "full" },
    { type: "refused", reason: "refused" },
    { type: "refused", reason: "closed" },
    { type: "refused", reason: "taken" },
    { type: "knocking", member: MEMBER },
    { type: "joined", member: MEMBER },
    { type: "changed", member: MEMBER },
    { type: "left", member: "abc" },
    { type: "owner", member: "abc" },
    { type: "closed" },
    { type: "signal", from: "abc", signal: CANDIDATE },
    { type: "error", message: "nope" },
]

/** Reading what a client sent must fail with a ProtocolError, and with nothing else. */
function expectClientRefused(text: string): void {
    expect(() => readClientMessage(text), text.slice(0, 80)).toThrow(ProtocolError)
}

function expectServerRefused(text: string): void {
    expect(() => readServerMessage(text), text.slice(0, 80)).toThrow(ProtocolError)
}

describe("codec, what a client sends", () => {
    test.each(CLIENT_MESSAGES)("written → read back the same (%j)", message => {
        expect(readClientMessage(writeMessage(message))).toEqual(message)
    })

    test("not JSON, or not an object → refused", () => {
        for(const text of ["", "{", "not json", "null", "42", "\"hello\"", "[]", "[{\"type\":\"hello\"}]"]) expectClientRefused(text)
    })

    test("a type unknown or missing → refused, and the type is named", () => {
        expectClientRefused("{}")
        expectClientRefused("{\"type\":\"launch\"}")
        expect(() => readClientMessage("{\"type\":\"launch\"}")).toThrow(/launch/)
    })

    test("a type of the server sent by a client → refused", () => {
        expectClientRefused("{\"type\":\"welcome\",\"iceServers\":[]}")
    })

    test("extra fields → left out of what is read", () => {
        expect(readClientMessage("{\"type\":\"hello\",\"version\":2,\"extra\":true}")).toEqual({ type: "hello", version: 2 })
    })

    test("hello with a version that is not an integer → refused", () => {
        for(const version of ["\"2\"", "2.5", "null", "true"]) expectClientRefused(`{"type":"hello","version":${version}}`)
        expectClientRefused("{\"type\":\"hello\"}")
    })

    describe("create", () => {
        const create = (fields: Record<string, unknown>): string => JSON.stringify({
            type: "create", shape: "star", name: "g", data: null, capacity: 2, ...fields,
        })

        test("a shape other than star or mesh → refused", () => {
            expectClientRefused(create({ shape: "ring" }))
            expectClientRefused(create({ shape: undefined }))
        })

        test("capacity out of 1 to the maximum, or not an integer → refused; the bounds are fine", () => {
            for(const capacity of [0, -1, MAX_CAPACITY + 1, 1.5, "2", null]) expectClientRefused(create({ capacity }))
            expect(readClientMessage(create({ capacity: 1 }))).toMatchObject({ capacity: 1 })
            const biggest = readClientMessage(create({ capacity: MAX_CAPACITY }))
            expect(biggest).toMatchObject({ capacity: MAX_CAPACITY })
        })

        test("name longer than the limit, or not a text → refused; the limit itself is fine", () => {
            expectClientRefused(create({ name: "x".repeat(MAX_NAME_LENGTH + 1) }))
            expectClientRefused(create({ name: 3 }))
            expectClientRefused(create({ name: undefined }))
            expect(readClientMessage(create({ name: "x".repeat(MAX_NAME_LENGTH) }))).toMatchObject({ name: "x".repeat(MAX_NAME_LENGTH) })
        })

        test("data missing → refused, data null is fine", () => {
            expectClientRefused(create({ data: undefined }))
            expect(readClientMessage(create({ data: null }))).toMatchObject({ data: null })
        })

        test("data over the limit → refused; at the limit it is fine", () => {
            const fits = "x".repeat(MAX_DATA_LENGTH - 2)
            expect(readClientMessage(create({ data: fits }))).toMatchObject({ data: fits })
            expectClientRefused(create({ data: fits + "x" }))
        })

        test("no code asked → none in what is read", () => {
            expect(readClientMessage(create({}))).not.toHaveProperty("code")
        })

        test("a code asked → read in capitals", () => {
            expect(readClientMessage(create({ code: "ab-12" }))).toMatchObject({ code: "AB-12" })
        })

        test("a code with other characters, empty, or too long → refused", () => {
            for(const code of ["", "a b", "a_b", "é", "a:b", "x".repeat(MAX_CODE_LENGTH + 1), 5, null]) expectClientRefused(create({ code }))
            expect(readClientMessage(create({ code: "x".repeat(MAX_CODE_LENGTH) }))).toMatchObject({ code: "X".repeat(MAX_CODE_LENGTH) })
        })
    })

    describe("join, admit, setData", () => {
        test("join without a code or data → refused", () => {
            expectClientRefused("{\"type\":\"join\",\"data\":null}")
            expectClientRefused("{\"type\":\"join\",\"code\":\"A\"}")
            expectClientRefused("{\"type\":\"join\",\"code\":1,\"data\":null}")
        })

        test("join is not limited in the shape of its code: the server looks it up", () => {
            expect(readClientMessage("{\"type\":\"join\",\"code\":\"abc\",\"data\":null}")).toMatchObject({ code: "abc" })
        })

        test("admit without a member, or with an accepted that is not a boolean → refused", () => {
            expectClientRefused("{\"type\":\"admit\",\"accepted\":true}")
            expectClientRefused("{\"type\":\"admit\",\"member\":\"a\"}")
            expectClientRefused("{\"type\":\"admit\",\"member\":\"a\",\"accepted\":\"yes\"}")
            expectClientRefused("{\"type\":\"admit\",\"member\":3,\"accepted\":true}")
        })

        test("setData without data, or with too much → refused", () => {
            expectClientRefused("{\"type\":\"setData\"}")
            expectClientRefused(JSON.stringify({ type: "setData", data: "x".repeat(MAX_DATA_LENGTH) }))
        })
    })

    describe("signal", () => {
        const signal = (value: unknown): string => JSON.stringify({ type: "signal", to: "a", signal: value })

        test("no target, or a target that is not a text → refused", () => {
            expectClientRefused(JSON.stringify({ type: "signal", signal: OFFER }))
            expectClientRefused(JSON.stringify({ type: "signal", to: 1, signal: OFFER }))
        })

        test("a signal that is no object, or of an unknown kind → refused", () => {
            for(const value of [null, 1, "x", [], {}, { kind: "other" }]) expectClientRefused(signal(value))
        })

        test("a description of a type other than offer or answer, or without sdp → refused", () => {
            expectClientRefused(signal({ kind: "description", type: "pranswer", sdp: "x" }))
            expectClientRefused(signal({ kind: "description", type: "offer" }))
            expectClientRefused(signal({ kind: "description", type: "offer", sdp: 3 }))
            expect(readClientMessage(signal({ kind: "description", type: "answer", sdp: "x" }))).toMatchObject({
                signal: { kind: "description", type: "answer", sdp: "x" },
            })
        })

        test("a candidate without its text, or with a mid or index of the wrong type → refused", () => {
            expectClientRefused(signal({ kind: "candidate" }))
            expectClientRefused(signal({ kind: "candidate", candidate: 1 }))
            expectClientRefused(signal({ kind: "candidate", candidate: "c", sdpMid: 1 }))
            expectClientRefused(signal({ kind: "candidate", candidate: "c", sdpMLineIndex: "0" }))
            expectClientRefused(signal({ kind: "candidate", candidate: "c", sdpMLineIndex: 0.5 }))
        })

        test("a candidate without a mid or an index → read with them as null", () => {
            expect(readClientMessage(signal({ kind: "candidate", candidate: "c" }))).toMatchObject({
                signal: { kind: "candidate", candidate: "c", sdpMid: null, sdpMLineIndex: null },
            })
        })

        test("an empty candidate, as the end of the candidates → kept", () => {
            expect(readClientMessage(signal({ kind: "candidate", candidate: "" }))).toMatchObject({
                signal: { candidate: "" },
            })
        })
    })

    test("a message longer than the limit → refused, before it is even parsed", () => {
        const text = JSON.stringify({ type: "setData", data: "x".repeat(MAX_MESSAGE_LENGTH) })
        expect(() => readClientMessage(text)).toThrow(/over/)
    })
})

describe("codec, what the server sends", () => {
    test.each(SERVER_MESSAGES)("written → read back the same (%j)", message => {
        expect(readServerMessage(writeMessage(message))).toEqual(message)
    })

    test("not JSON, or not an object → refused", () => {
        for(const text of ["", "{", "null", "7", "[]"]) expectServerRefused(text)
    })

    test("a type unknown, missing, or of a client → refused", () => {
        expectServerRefused("{}")
        expectServerRefused("{\"type\":\"hello\",\"version\":2}")
        expectServerRefused("{\"type\":\"nope\"}")
    })

    test("welcome → each ice server is checked", () => {
        expectServerRefused("{\"type\":\"welcome\"}")
        expectServerRefused("{\"type\":\"welcome\",\"iceServers\":{}}")
        expectServerRefused("{\"type\":\"welcome\",\"iceServers\":[1]}")
        expectServerRefused("{\"type\":\"welcome\",\"iceServers\":[{}]}")
        expectServerRefused("{\"type\":\"welcome\",\"iceServers\":[{\"urls\":[1]}]}")
        expectServerRefused("{\"type\":\"welcome\",\"iceServers\":[{\"urls\":[\"a\"],\"username\":\"u\"}]}")
        expectServerRefused("{\"type\":\"welcome\",\"iceServers\":[{\"urls\":[\"a\"],\"credential\":\"c\"}]}")
    })

    test("entered → every field is checked", () => {
        const entered = { type: "entered", code: "A", name: "n", shape: "star", self: MEMBER, owner: "o", members: [] }
        expect(readServerMessage(JSON.stringify(entered))).toEqual(entered)
        for(const field of ["code", "name", "shape", "self", "owner", "members"]){
            expectServerRefused(JSON.stringify({ ...entered, [field]: undefined }))
        }
        expectServerRefused(JSON.stringify({ ...entered, shape: "ring" }))
        expectServerRefused(JSON.stringify({ ...entered, members: [{ id: 1, data: null }] }))
        expectServerRefused(JSON.stringify({ ...entered, members: [{ id: "a" }] }))
        expectServerRefused(JSON.stringify({ ...entered, members: "a" }))
    })

    test("refused → only the five reasons are read", () => {
        expectServerRefused("{\"type\":\"refused\"}")
        expectServerRefused("{\"type\":\"refused\",\"reason\":\"banned\"}")
    })

    test("knocking, joined, changed → carry a member; left, owner → carry its id", () => {
        for(const type of ["knocking", "joined", "changed"]){
            expectServerRefused(JSON.stringify({ type }))
            expectServerRefused(JSON.stringify({ type, member: "abc" }))
        }
        for(const type of ["left", "owner"]){
            expectServerRefused(JSON.stringify({ type }))
            expectServerRefused(JSON.stringify({ type, member: MEMBER }))
        }
    })

    test("signal → needs who it is from, and a signal", () => {
        expectServerRefused(JSON.stringify({ type: "signal", signal: OFFER }))
        expectServerRefused(JSON.stringify({ type: "signal", from: "a" }))
    })

    test("error → needs a message", () => {
        expectServerRefused("{\"type\":\"error\"}")
    })
})

describe("ProtocolError", () => {
    test("is an Error, named", () => {
        const error = new ProtocolError("x")
        expect(error).toBeInstanceOf(Error)
        expect(error.name).toBe("ProtocolError")
        expect(error.message).toBe("x")
    })
})
