import { Fault, ManualScheduler } from "@game/core"
import {
    Answerer, Asker, LocalRoom, PeerGoneFault, SyncTopic, TimeoutFault, UnreadableFault,
} from "@game/core/mecard/sync"
import type { SyncLink, SyncPeer } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

// --- Fixture builders ---

const TOPIC = new SyncTopic("team")
const QUESTIONS = new SyncTopic("team:ask")
const ANSWERS = new SyncTopic("team:answer")

interface Asking {
    readonly room: LocalRoom
    readonly timer: ManualScheduler
    readonly asker: Asker
    readonly peer: SyncPeer
    readonly link: SyncLink
    readonly faults: Fault[]
}

/** An asker over a room within the program, with a client joined. */
function asking(): Asking {
    const room = new LocalRoom()
    const timer = new ManualScheduler()
    const asker = new Asker(TOPIC, room, timer)
    const faults: Fault[] = []
    asker.faulted.add(fault => faults.push(fault))
    const peers: SyncPeer[] = []
    room.onJoin(joined => peers.push(joined))
    const link = room.join("a")
    return { room, timer, asker, peer: peers[0], link, faults }
}

// --- Tests ---

describe("Asker", () => {
    test("a question answered → the answer", async() => {
        const { asker, peer, link } = asking()
        new Answerer(TOPIC, link, question => `you said ${question}`)
        expect(await asker.ask(peer, "hello", 1_000)).toBe("you said hello")
    })

    test("a text with line breaks → both ways, intact", async() => {
        const { asker, peer, link } = asking()
        new Answerer(TOPIC, link, question => question.toUpperCase())
        expect(await asker.ask(peer, "a\nb\n\nc", 1_000)).toBe("A\nB\n\nC")
    })

    test("no answer in time → a TimeoutFault, told as faulted too, and it never rejects", async() => {
        const { asker, peer, timer, faults } = asking()
        const answer = asker.ask(peer, "anyone?", 5_000)
        timer.advance(5_000)
        const fault = await answer
        expect(fault).toBeInstanceOf(TimeoutFault)
        expect((fault as TimeoutFault).who).toBe("a")
        expect((fault as TimeoutFault).request).toBe("anyone?")
        expect(faults).toEqual([fault])
    })

    test("the client leaving before it answers → a PeerGoneFault", async() => {
        const { asker, peer, room } = asking()
        const answer = asker.ask(peer, "anyone?", 5_000)
        room.leave("a")
        expect(await answer).toBeInstanceOf(PeerGoneFault)
    })

    test("two questions → each gets its own answer, even when answered in the other order", async() => {
        const { asker, peer, link } = asking()
        const asked: string[] = []
        QUESTIONS.source(link).listen(text => asked.push(text))
        const first = asker.ask(peer, "one", 1_000)
        const second = asker.ask(peer, "two", 1_000)
        const numberOf = (text: string): string => text.slice(0, text.indexOf("\n"))
        expect(numberOf(asked[0])).not.toBe(numberOf(asked[1]))
        ANSWERS.link(link).send(`${numberOf(asked[1])}\ntwo!`)
        ANSWERS.link(link).send(`${numberOf(asked[0])}\none!`)
        expect(await first).toBe("one!")
        expect(await second).toBe("two!")
    })

    test("an answer to a question gone by → left out, and the next question is not confused", async() => {
        const { asker, peer, link, timer } = asking()
        const asked: string[] = []
        QUESTIONS.source(link).listen(text => asked.push(text))
        const slow = asker.ask(peer, "slow", 1_000)
        timer.advance(1_000)
        expect(await slow).toBeInstanceOf(TimeoutFault)
        const next = asker.ask(peer, "next", 1_000)
        ANSWERS.link(link).send(`${asked[0].slice(0, asked[0].indexOf("\n"))}\nlate`)
        ANSWERS.link(link).send(`${asked[1].slice(0, asked[1].indexOf("\n"))}\non time`)
        expect(await next).toBe("on time")
    })

    test("an answer from another client → not taken for the answer of this one", async() => {
        const { asker, peer, room, timer } = asking()
        const other = room.join("b")
        const answer = asker.ask(peer, "mine", 1_000)
        ANSWERS.link(other).send("1\nstolen")
        timer.advance(1_000)
        expect(await answer).toBeInstanceOf(TimeoutFault)
    })

    test("an answer that cannot be read → an UnreadableFault is told, and the question waits for its timeout", async() => {
        const { asker, peer, link, timer, faults } = asking()
        const answer = asker.ask(peer, "hello", 1_000)
        ANSWERS.link(link).send("no number here")
        expect(faults[0]).toBeInstanceOf(UnreadableFault)
        timer.advance(1_000)
        expect(await answer).toBeInstanceOf(TimeoutFault)
    })
})

describe("Answerer", () => {
    test("a question that cannot be read → told as an UnreadableFault, nothing answered", () => {
        const { peer, link } = asking()
        const answerer = new Answerer(TOPIC, link, question => question)
        const faults: Fault[] = []
        answerer.faulted.add(fault => faults.push(fault))
        const answers: string[] = []
        ANSWERS.source(peer).listen(text => answers.push(text))
        QUESTIONS.link(peer).send("no number here")
        expect(faults).toHaveLength(1)
        expect(faults[0]).toBeInstanceOf(UnreadableFault)
        expect(answers).toEqual([])
    })
})
