import {
    ChatGuest, ChatHost, CHAT_TOPIC, LocalRoom, LocalSync, readChatMessage, UnreadableFault, writeChatMessage,
} from "@game/core/mecard/sync"
import type { ChatAuthor, ChatLine } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

// --- Fixture builders ---

const ALICE: ChatAuthor = { name: "Alice", hue: 0 }
const BOB: ChatAuthor = { name: "Bob", hue: 120 }
const CARA: ChatAuthor = { name: "Cara", hue: 240 }

/** A chat on a room within the program: the host, and a way to bring clients. */
function chatting() {
    const room = new LocalRoom()
    const channel = new LocalSync()
    const host = new ChatHost(room, channel, ALICE)
    const hostHeard: ChatLine[] = []
    host.heard.add(line => hostHeard.push(line))
    /** A client connecting: it speaks through its link to the room, and hears the channel. */
    const join = (id: string, author: ChatAuthor) => {
        const link = room.join(id)
        const way = { send: (message: string) => link.send(message), listen: channel.listen.bind(channel) }
        const guest = new ChatGuest(way, author)
        const heard: ChatLine[] = []
        guest.heard.add(line => heard.push(line))
        return { guest, heard }
    }
    return { host, hostHeard, join, room, channel }
}

// --- Tests ---

describe("writeChatMessage and readChatMessage", () => {
    test("a message written → read back as it was", () => {
        const text = writeChatMessage({ author: BOB, text: "salut" })
        expect(readChatMessage(text)).toEqual({ author: BOB, text: "salut" })
    })

    test("text that is not JSON → an unreadable fault", () => {
        expect(readChatMessage("{nope")).toBeInstanceOf(UnreadableFault)
    })

    test("JSON of another shape → an unreadable fault", () => {
        expect(readChatMessage(JSON.stringify({ text: "no author" }))).toBeInstanceOf(UnreadableFault)
        expect(readChatMessage(JSON.stringify({ author: { name: "Bob", hue: "mauve" }, text: "x" })))
            .toBeInstanceOf(UnreadableFault)
    })

    test("a hue out of the circle → brought back into it", () => {
        const read = readChatMessage(JSON.stringify({ author: { name: "Bob", hue: -30 }, text: "x" }))
        expect(read).toEqual({ author: { name: "Bob", hue: 330 }, text: "x" })
    })
})

describe("ChatHost and ChatGuest", () => {
    test("the host speaking → everyone hears it, host included, with its author", () => {
        const { host, hostHeard, join } = chatting()
        const bob = join("bob", BOB)
        host.say("bienvenue")
        const expected = [{ from: "host", author: ALICE, text: "bienvenue" }]
        expect(hostHeard).toEqual(expected)
        expect(bob.heard).toEqual(expected)
    })

    test("a client speaking → the host and the others hear it, and the client itself", () => {
        const { hostHeard, join } = chatting()
        const bob = join("bob", BOB)
        const cara = join("cara", CARA)
        bob.guest.say("coucou")
        const expected = [{ from: "bob", author: BOB, text: "coucou" }]
        expect(hostHeard).toEqual(expected)
        expect(cara.heard).toEqual(expected)
        expect(bob.heard).toEqual(expected)
    })

    test("lines in order → heard in the order they were said", () => {
        const { host, join } = chatting()
        const bob = join("bob", BOB)
        host.say("un")
        bob.guest.say("deux")
        host.say("trois")
        expect(bob.heard.map(line => line.text)).toEqual(["un", "deux", "trois"])
    })

    test("a client connecting after → does not hear what was said before", () => {
        const { host, join } = chatting()
        host.say("avant")
        const late = join("late", BOB)
        expect(late.heard).toEqual([])
    })

    test("a client that left → is not relayed any more", () => {
        const { hostHeard, join, room } = chatting()
        const bob = join("bob", BOB)
        room.leave("bob")
        bob.guest.say("encore là ?")
        expect(hostHeard).toEqual([])
    })

    test("a message that cannot be read → tells a fault, no line", () => {
        const { host, hostHeard, room } = chatting()
        const faults: unknown[] = []
        host.faulted.add(fault => faults.push(fault))
        room.join("bob")
        // A client of another version, saying a line that is no message of the chat.
        const link = room.join("old")
        link.send(`${CHAT_TOPIC.name}:{"text":1}`)
        expect(hostHeard).toEqual([])
        expect(faults).toHaveLength(1)
        expect(faults[0]).toBeInstanceOf(UnreadableFault)
    })

    test("a guest that hears an unreadable line → tells a fault", () => {
        const { channel, join } = chatting()
        const bob = join("bob", BOB)
        const faults: unknown[] = []
        bob.guest.faulted.add(fault => faults.push(fault))
        channel.send(`${CHAT_TOPIC.name}:host\nnot json`)
        expect(bob.heard).toEqual([])
        expect(faults).toHaveLength(1)
    })

    test("a chat disposed → says and hears nothing more", () => {
        const { host, hostHeard, join } = chatting()
        const bob = join("bob", BOB)
        bob.guest.dispose()
        host.say("hello")
        expect(bob.heard).toEqual([])
        host.dispose()
        host.say("again")
        expect(hostHeard).toHaveLength(1)
    })
})
