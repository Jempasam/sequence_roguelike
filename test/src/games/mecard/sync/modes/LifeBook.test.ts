import { LifeBook, LivesReceiver, LocalSync, LOSERS_LOSE_ONE } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

// --- Fixture builders ---

function booked(ids: string[], lives = 2) {
    const channel = new LocalSync()
    const book = new LifeBook(ids, lives, channel)
    const receiver = new LivesReceiver(channel)
    const lost: string[] = []
    const out: string[] = []
    const standing: string[] = []
    book.lifeLost.add(({ id, left }) => lost.push(`${id}:${left}`))
    book.eliminated.add(id => out.push(id))
    book.lastStanding.add(id => standing.push(id))
    return { channel, book, receiver, lost, out, standing }
}

// --- Tests ---

describe("LifeBook", () => {
    test("a life lost → told, and never under none", () => {
        const { book, lost, out } = booked(["a", "b"])
        book.lose("a")
        book.lose("a")
        book.lose("a")
        expect(lost).toEqual(["a:1", "a:0"])
        expect(out).toEqual(["a"])
        expect(book.livesOf("a")).toBe(0)
        expect(book.alive()).toEqual(["b"])
    })

    test("a player that left → eliminated at once, once", () => {
        const { book, out } = booked(["a", "b"], 6)
        book.eliminate("a")
        book.eliminate("a")
        expect(out).toEqual(["a"])
        expect(book.isAlive("a")).toBe(false)
    })

    test("settle → the last one standing, only when there is one", () => {
        const { book, standing } = booked(["a", "b", "c"], 1)
        book.lose("a")
        book.settle()
        expect(standing).toEqual([])
        book.lose("b")
        book.settle()
        expect(standing).toEqual(["c"])
    })

    test("everyone eliminated together → no one standing", () => {
        const { book, standing } = booked(["a", "b"], 1)
        book.lose("a")
        book.lose("b")
        book.settle()
        expect(standing).toEqual([])
        expect(book.alive()).toEqual([])
    })

    test("a player unknown → nothing happens", () => {
        const { book, lost } = booked(["a"])
        book.lose("nobody")
        book.eliminate("nobody")
        expect(lost).toEqual([])
    })

    test("the players hear the lives, each change once, and a late one the state as it stands", () => {
        const { channel, book, receiver } = booked(["a", "b"])
        const changes: string[] = []
        const eliminated: string[] = []
        receiver.livesChanged.add(({ id, lives }) => changes.push(`${id}:${lives}`))
        receiver.eliminated.add(id => eliminated.push(id))
        book.lose("a")
        book.lose("a")
        expect(changes).toEqual(["a:1", "a:0"])
        expect(eliminated).toEqual(["a"])
        const late = new LivesReceiver(channel)
        expect(late.livesOf("a")).toBe(0)
        expect(late.livesOf("b")).toBe(2)
    })

    test("the book and the receiver → the same view of the lives", () => {
        const { book, receiver } = booked(["a", "b"])
        const fromBook: string[] = []
        const fromReceiver: string[] = []
        book.livesChanged.add(({ id, lives }) => fromBook.push(`${id}:${lives}`))
        receiver.livesChanged.add(({ id, lives }) => fromReceiver.push(`${id}:${lives}`))
        book.lose("a")
        book.eliminate("b")
        book.lose("a")
        expect(fromBook).toEqual(["a:1", "b:0", "a:0"])
        expect(fromReceiver).toEqual(fromBook)
        expect(book.alive()).toEqual([])
        expect(receiver.alive()).toEqual([])
        expect(receiver.livesOf("a")).toBe(book.livesOf("a"))
    })

    test("a message that cannot be read → left out, told as a fault", () => {
        const { channel, receiver } = booked(["a"])
        let faults = 0
        receiver.faulted.add(() => faults++)
        channel.send("lives:{\"lives\":3}")
        expect(faults).toBe(1)
    })
})

describe("LOSERS_LOSE_ONE", () => {
    const fight = { number: 0, sides: [["a"], ["b", "c"]] as const }

    test("a camp that won → each player of the other loses one life", () => {
        const { book } = booked(["a", "b", "c"])
        LOSERS_LOSE_ONE.apply(fight, 0, book)
        expect([book.livesOf("a"), book.livesOf("b"), book.livesOf("c")]).toEqual([2, 1, 1])
    })

    test("a draw → nobody loses anything", () => {
        const { book } = booked(["a", "b", "c"])
        LOSERS_LOSE_ONE.apply(fight, null, book)
        expect([book.livesOf("a"), book.livesOf("b"), book.livesOf("c")]).toEqual([2, 2, 2])
    })
})
