import { FIXED_SEATS, FORMER_FIRST, NO_PICK, SeatTakenFault, Seats } from "@game/core/mecard/sync"
import type { SeatMode, SeatPolicy } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

// --- Fixture builders ---

/** Seats that are plain names, from a list the test changes: no run is needed to give them. */
const NAMED: SeatMode<string[]> = {
    candidates: names => names.map(name => ({ name })),
    seatHost: (seats, names) => seats.seatHost(names),
    enterBattle: seats => seats.clear(),
}

function seated(policy: SeatPolicy = FIXED_SEATS, reserveMs = 0, names = ["a", "b", "c"]) {
    let now = 0
    const seats = new Seats(NAMED, policy, { clock: () => now, reserveMs })
    return { seats, names, tick: (ms: number): void => { now += ms } }
}

// --- Tests ---

describe("Seats, a seat freed", () => {
    test("a client dropping its seats → remembered as who held them", () => {
        const { seats, names, tick } = seated()
        seats.seat("ana", names)
        tick(5)
        seats.drop("ana")
        expect(seats.holderOf("a")).toBeNull()
        expect(seats.formerOf("a")).toEqual({ id: "ana", since: 5 })
    })

    test("a seat given again → no longer remembered", () => {
        const { seats, names } = seated()
        seats.seat("ana", names)
        seats.drop("ana")
        seats.seat("bob", names)
        expect(seats.holderOf("a")).toBe("bob")
        expect(seats.formerOf("a")).toBeNull()
    })

    test("a seat kept for who left → not given to another by itself, nor on its wish, until the time is over", () => {
        const { seats, names, tick } = seated(FIXED_SEATS, 10, ["a"])
        seats.seat("ana", names)
        seats.drop("ana")
        seats.seat("bob", names)
        expect(seats.holderOf("a")).toBeNull()
        expect(seats.claim("bob", "a", names)).toBeInstanceOf(SeatTakenFault)
        tick(9)
        seats.seat("bob", names)
        expect(seats.holderOf("a")).toBeNull()
        tick(1)
        seats.seat("bob", names)
        expect(seats.holderOf("a")).toBe("bob")
    })

    test("who left, coming back while its seat is kept → given it, whatever the order of the others", () => {
        const { seats, names, tick } = seated(FORMER_FIRST, 10)
        seats.seat("ana", names)
        seats.seat("bob", names)
        seats.drop("ana")
        seats.drop("bob")
        tick(2)
        seats.seat("bob", names)
        seats.seat("ana", names)
        expect(seats.holderOf("a")).toBe("ana")
        expect(seats.holderOf("b")).toBe("bob")
    })

    test("the first policy, with no time kept → a seat freed goes to the first that asks", () => {
        const { seats, names } = seated()
        seats.seat("ana", names)
        seats.drop("ana")
        seats.seat("bob", names)
        expect(seats.holderOf("a")).toBe("bob")
    })

    test("a seat given back on purpose → kept for it as well", () => {
        const { seats, names } = seated(FIXED_SEATS, 10)
        seats.seat("ana", names)
        seats.release("ana", "a")
        expect(seats.formerOf("a")?.id).toBe("ana")
        expect(seats.claim("bob", "a", names)).toBeInstanceOf(SeatTakenFault)
        expect(seats.claim("ana", "a", names)).toBeNull()
    })

    test("vacant seats → those nobody holds, and not the host's", () => {
        const { seats, names } = seated()
        seats.seatHost(names)
        seats.seat("ana", names)
        expect(seats.vacant(names).map(seat => seat.name)).toEqual(["c"])
        seats.drop("ana")
        expect(seats.vacant(names).map(seat => seat.name)).toEqual(["b", "c"])
    })

    test("seats that may not be held any more → forgotten with who held them", () => {
        const { seats, names } = seated()
        seats.seat("ana", names)
        seats.drop("ana")
        seats.prune(["b", "c"])
        expect(seats.formerOf("a")).toBeNull()
    })

    test("everything cleared → nobody remembered", () => {
        const { seats, names } = seated(NO_PICK)
        seats.claim("ana", "a", names)
        seats.drop("ana")
        seats.clear()
        expect(seats.formerOf("a")).toBeNull()
    })
})
