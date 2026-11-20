import { SWORDSMAN_KIT } from "@game/core/mecard"
import type { Fault } from "@game/core"
import {
    COOP_SEATS, DeniedFault, ENEMY_SEATS, FIRST_COME, FIXED_SEATS, HostApproves, NO_PICK, NotCandidateFault,
    NotHeldFault, SeatChoice, SeatPicker, SeatTakenFault,
} from "@game/core/mecard/sync"
import type { SeatArbiter, SeatMode, SeatPolicy } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

import { connected, fight, hosted } from "../fixtures"
import type { Hosted, Playing } from "../fixtures"

// --- Fixture builders ---

interface Choosing {
    readonly session: Hosted
    readonly choice: SeatChoice
    readonly faults: Fault[]

    /** A client that came to play, and can ask for seats. */
    join(id: string): Playing & { readonly picker: SeatPicker }
}

function choosing(
    mode: SeatMode = COOP_SEATS,
    policy: SeatPolicy = NO_PICK,
    arbiter: SeatArbiter = FIRST_COME,
): Choosing {
    const session = hosted(mode, policy)
    const choice = new SeatChoice(session.host.dealer, session.room, session.channel, arbiter, session.run)
    const faults: Fault[] = []
    choice.faulted.add(fault => faults.push(fault))
    return {
        session,
        choice,
        faults,
        join: id => {
            const playing = connected(session, id)
            return { ...playing, picker: new SeatPicker(playing.link, session.channel) }
        },
    }
}

// --- Tests ---

describe("SeatChoice with no seat given by itself", () => {
    test("a client → plays nothing until it asks, then what it asked for", () => {
        const { session, join } = choosing()
        const a = join("a")
        expect(a.guest.units).toEqual([])
        const [hero] = session.run.heroes
        a.picker.take(hero.name)
        expect(a.guest.units).toEqual([hero.name])
        expect(session.host.isGuests(hero)).toBe(true)
    })

    test("the offer → the seats that can be asked for, and who holds them, told to every client", () => {
        const { session, join } = choosing()
        const a = join("a")
        const b = join("b")
        const [hero] = session.run.heroes
        a.picker.take(hero.name)
        for(const picker of [a.picker, b.picker]){
            expect(picker.offer?.candidates).toEqual(session.run.heroes.map(each => each.name))
            expect(picker.offer?.held).toEqual({ [hero.name]: "a" })
        }
    })

    test("two clients asking for one seat → the first is given it, the second a SeatTakenFault", () => {
        const { session, join, faults } = choosing()
        const a = join("a")
        const b = join("b")
        const [hero] = session.run.heroes
        a.picker.take(hero.name)
        b.picker.take(hero.name)
        expect(a.guest.units).toEqual([hero.name])
        expect(b.guest.units).toEqual([])
        expect(faults).toHaveLength(1)
        expect(faults[0]).toBeInstanceOf(SeatTakenFault)
        expect(faults[0].who).toBe("b")
        expect((faults[0] as SeatTakenFault).holder).toBe("a")
        // The client is told nothing of the refusal: it sees the offer did not change for it.
        expect(b.picker.offer?.held).toEqual({ [hero.name]: "a" })
    })

    test("a seat that does not exist → a NotCandidateFault", () => {
        const { join, faults } = choosing()
        join("a").picker.take("Nobody")
        expect(faults[0]).toBeInstanceOf(NotCandidateFault)
    })

    test("a seat given back → free for another, and told", () => {
        const { session, join, faults } = choosing()
        const a = join("a")
        const b = join("b")
        const [hero] = session.run.heroes
        a.picker.take(hero.name)
        a.picker.release(hero.name)
        expect(faults).toEqual([])
        expect(a.guest.units).toEqual([])
        b.picker.take(hero.name)
        expect(b.guest.units).toEqual([hero.name])
    })

    test("a seat given back that is not held → a NotHeldFault, and the offer sent again", () => {
        const { session, join, faults } = choosing()
        const a = join("a")
        const b = join("b")
        const [hero] = session.run.heroes
        a.picker.take(hero.name)
        let offers = 0
        b.picker.offered.add(() => offers++)
        b.picker.release(hero.name)
        expect(faults[0]).toBeInstanceOf(NotHeldFault)
        expect(faults[0].who).toBe("b")
        expect(offers).toBe(1)
    })

    test("a client asking for another seat → exchanged, the first free", () => {
        const { session, join } = choosing()
        const a = join("a")
        const [first, second] = session.run.heroes
        a.picker.take(first.name)
        a.picker.take(second.name)
        expect(a.guest.units).toEqual([second.name])
        expect(session.host.isGuests(first)).toBe(false)
    })

    test("a client leaving for good → its seat free, told to the others", () => {
        const { session, join } = choosing()
        const a = join("a")
        const b = join("b")
        const [hero] = session.run.heroes
        a.picker.take(hero.name)
        session.room.leave("a")
        expect(session.host.isGuests(hero)).toBe(false)
        expect(b.picker.offer?.held).toEqual({})
    })

    test("a client whose connection is lost → keeps its seat, and is told the offer again once back", () => {
        const { session, join } = choosing()
        const a = join("a")
        const [hero] = session.run.heroes
        a.picker.take(hero.name)
        session.room.drop("a")
        expect(session.host.isGuests(hero)).toBe(true)
        let offers = 0
        a.picker.offered.add(() => offers++)
        session.room.back("a")
        expect(offers).toBeGreaterThan(0)
        expect(a.picker.offer?.held).toEqual({ [hero.name]: "a" })
    })

    test("a client coming later → told the offer as it stands", () => {
        const { session, join } = choosing()
        const [hero] = session.run.heroes
        join("a").picker.take(hero.name)
        const b = join("b")
        expect(b.picker.offer?.held).toEqual({ [hero.name]: "a" })
    })

    test("a message that cannot be read → a fault of the choice, nothing given", () => {
        const { session, join, faults } = choosing()
        const a = join("a")
        a.link.send("seat-take:not json")
        expect(faults).toHaveLength(1)
        expect(a.guest.units).toEqual([])
        expect(session.host.isGuests(session.run.heroes[0])).toBe(false)
    })
})

describe("SeatChoice over seats given by itself", () => {
    test("FIXED_SEATS → the seat given by itself can be exchanged for another that is free", () => {
        const { session, join } = choosing(COOP_SEATS, FIXED_SEATS)
        session.run.hire(SWORDSMAN_KIT)
        const a = join("a")
        const [, given] = session.run.heroes
        expect(a.guest.units).toEqual([given.name])
        // The first hero is the host's, the given one the client's: ask for the third, which is free.
        const free = session.run.heroes[2]
        expect(session.host.isGuests(free)).toBe(false)
        a.picker.take(free.name)
        expect(a.guest.units).toEqual([free.name])
    })

    test("a seat the host keeps → a SeatTakenFault, the host holding it", () => {
        const { session, join, faults } = choosing(COOP_SEATS, FIXED_SEATS)
        const a = join("a")
        a.picker.take(session.run.heroes[0].name)
        expect(faults[0]).toBeInstanceOf(SeatTakenFault)
        expect((faults[0] as SeatTakenFault).holder).toBe(null)
    })
})

describe("SeatChoice in enemy mode", () => {
    test("a wish once the rounds began → a NotCandidateFault", () => {
        const { session, join, faults } = choosing(ENEMY_SEATS, NO_PICK)
        const a = join("a")
        const battle = fight(session.run)
        const monster = battle.units.find(unit => unit.team === session.run.monstersTeam && unit.decisive)
        if(!monster) throw new Error("No monster.")
        battle.advance()
        a.picker.take(monster.name)
        expect(faults[0]).toBeInstanceOf(NotCandidateFault)
        expect(a.guest.units).toEqual([])
    })

    test("a wish before the first round → given, and the monster played by the client", () => {
        const { session, join } = choosing(ENEMY_SEATS, NO_PICK)
        const a = join("a")
        const battle = fight(session.run)
        const monster = battle.units.find(unit => unit.team === session.run.monstersTeam && unit.decisive)
        if(!monster) throw new Error("No monster.")
        a.picker.take(monster.name)
        expect(a.guest.units).toEqual([monster.name])
    })
})

describe("HostApproves", () => {
    function approving(): Choosing & { readonly approves: HostApproves, readonly wishes: string[] } {
        const approves = new HostApproves()
        const base = choosing(COOP_SEATS, NO_PICK, approves)
        const wishes: string[] = []
        approves.wished.add(({ id, unit }) => wishes.push(`${id}:${unit}`))
        return { ...base, approves, wishes }
    }

    test("a wish → told to the host, and nothing moves before it decides", () => {
        const { session, join, wishes } = approving()
        const a = join("a")
        const [hero] = session.run.heroes
        a.picker.take(hero.name)
        expect(wishes).toEqual([`a:${hero.name}`])
        expect(a.guest.units).toEqual([])
    })

    test("granted → given, once the host says", () => {
        const { session, join, choice } = approving()
        const a = join("a")
        const [hero] = session.run.heroes
        a.picker.take(hero.name)
        expect(choice.grant("a", hero.name)).toBe(null)
        expect(a.guest.units).toEqual([hero.name])
    })

    test("denied → a DeniedFault, and nothing given", () => {
        const { session, join, choice, faults } = approving()
        const a = join("a")
        const [hero] = session.run.heroes
        a.picker.take(hero.name)
        choice.deny("a", hero.name)
        expect(faults[0]).toBeInstanceOf(DeniedFault)
        expect(a.guest.units).toEqual([])
    })

    test("granted too late → a fault: the seat taken meanwhile, or the client gone", () => {
        const { session, join, choice } = approving()
        const a = join("a")
        const b = join("b")
        const [hero] = session.run.heroes
        a.picker.take(hero.name)
        b.picker.take(hero.name)
        expect(choice.grant("a", hero.name)).toBe(null)
        expect(choice.grant("b", hero.name)).toBeInstanceOf(SeatTakenFault)
        const second = session.run.heroes[1]
        a.picker.take(second.name)
        session.room.leave("a")
        expect(choice.grant("a", second.name)).toBeInstanceOf(NotCandidateFault)
    })
})
