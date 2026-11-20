import { ManualScheduler } from "@game/core"
import type { Fault } from "@game/core"
import {
    Admissions, JOIN_RETRY_MS, JOIN_TRIES, LocalRoom, NotAdmittedFault, Participation, ParticipationReceiver,
    PARTICIPATE_TOPIC,
} from "@game/core/mecard/sync"
import type { Admission, Arrival, ParticipationMessage, ParticipationPolicy } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

// --- Fixture builders ---

const GAME = 1

/** A policy that writes down what it is asked, and gives the seats it is told to give. */
class Recorded implements ParticipationPolicy {


    public readonly events: string[] = []
    public next: (who: Arrival) => Admission = who => Admissions.seat(`seat-${who.id}`)

    public admit(who: Arrival): Admission {
        this.events.push(`admit ${who.id}`)
        return this.next(who)
    }

    public onLost(who: Arrival): void { this.events.push(`lost ${who.id}`) }
    public onBack(who: Arrival): void { this.events.push(`back ${who.id}`) }
    public onQuit(who: Arrival): void { this.events.push(`quit ${who.id}`) }
    public onGone(who: Arrival): void { this.events.push(`gone ${who.id}`) }
}

function hosted(): {
    readonly room: LocalRoom
    readonly policy: Recorded
    readonly participation: Participation
    readonly timer: ManualScheduler
    readonly faults: Fault[]
} {
    const room = new LocalRoom()
    const policy = new Recorded()
    const participation = new Participation(room, GAME, policy)
    const faults: Fault[] = []
    participation.faulted.add(fault => faults.push(fault))
    return { room, policy, participation, timer: new ManualScheduler(), faults }
}

/** A client joining: it says so, and hears what it holds. */
function playing(
    room: LocalRoom, timer: ManualScheduler, id: string, game = GAME,
): { readonly receiver: ParticipationReceiver, readonly heard: ParticipationMessage[] } {
    const receiver = new ParticipationReceiver(room.join(id), game, timer)
    receiver.join()
    // A local room answers at once, as the constructor says it joins: what was told then is the state.
    const heard: ParticipationMessage[] = receiver.state ? [receiver.state] : []
    receiver.changed.add(state => heard.push(state))
    return { receiver, heard }
}

// --- Tests ---

describe("Participation", () => {
    test("a client joining → the mode is asked, and the client told what it holds", () => {
        const { room, policy, participation, timer } = hosted()
        const { heard } = playing(room, timer, "a")
        expect(policy.events).toEqual(["admit a"])
        expect(heard).toEqual([{ game: GAME, role: "player", seat: "seat-a" }])
        expect(participation.stateOf("a")).toEqual({ game: GAME, role: "player", seat: "seat-a" })
    })

    test("the mode gives a spectator → told it only watches", () => {
        const { room, policy, timer } = hosted()
        policy.next = () => Admissions.spectate()
        const { heard } = playing(room, timer, "a")
        expect(heard).toEqual([{ game: GAME, role: "spectator", seat: null }])
    })

    test("the mode refuses → the fault is told, and the client watches", () => {
        const { room, policy, timer, faults } = hosted()
        const refusal = new NotAdmittedFault()
        policy.next = () => Admissions.refuse(refusal)
        const { heard } = playing(room, timer, "a")
        expect(faults).toEqual([refusal])
        expect(heard).toEqual([{ game: GAME, role: "spectator", seat: null }])
    })

    test("joining twice → the mode is asked once, the state told again", () => {
        const { room, policy, timer } = hosted()
        const link = room.join("a")
        const receiver = new ParticipationReceiver(link, GAME, timer)
        receiver.join()
        const told: string[] = []
        link.listen(message => told.push(message))
        PARTICIPATE_TOPIC.link(link).send(JSON.stringify({ kind: "join", game: GAME }))
        expect(policy.events).toEqual(["admit a"])
        expect(told.filter(message => message.startsWith("participation:"))).toHaveLength(1)
        expect(receiver.state?.seat).toBe("seat-a")
    })

    test("a client of another game → not heard", () => {
        const { room, policy, timer } = hosted()
        const { heard } = playing(room, timer, "a", GAME + 1)
        expect(policy.events).toEqual([])
        expect(heard).toEqual([])
    })

    test("a message that cannot be read → a fault, nothing else", () => {
        const { room, policy, faults } = hosted()
        PARTICIPATE_TOPIC.link(room.join("a")).send("not json")
        expect(faults).toHaveLength(1)
        expect(policy.events).toEqual([])
    })

    test("a connection lost then back → the mode told of both, the state told again, nothing re-admitted", () => {
        const { room, policy, participation, timer } = hosted()
        const { heard } = playing(room, timer, "a")
        room.drop("a")
        expect(participation.isLost("a")).toBe(true)
        room.back("a")
        expect(participation.isLost("a")).toBe(false)
        expect(policy.events).toEqual(["admit a", "lost a", "back a"])
        // The same state heard again is no change.
        expect(heard).toHaveLength(1)
    })

    test("someone that never joined, lost then gone → the mode is not told", () => {
        const { room, policy } = hosted()
        room.join("a")
        room.drop("a")
        room.back("a")
        room.leave("a")
        expect(policy.events).toEqual([])
    })

    test("a client leaving the game → the mode told, and it may join again and be admitted anew", () => {
        const { room, policy, participation, timer } = hosted()
        const { receiver, heard } = playing(room, timer, "a")
        receiver.quit()
        expect(policy.events).toEqual(["admit a", "quit a"])
        expect(participation.stateOf("a")).toBeNull()
        policy.next = () => Admissions.seat("taken-over")
        const again = new ParticipationReceiver(room.join("a"), GAME, timer)
        again.join()
        expect(again.state).toEqual({ game: GAME, role: "player", seat: "taken-over" })
        expect(heard).toHaveLength(1)
    })

    test("a client gone for good → the mode told once", () => {
        const { room, policy, participation, timer } = hosted()
        playing(room, timer, "a")
        room.leave("a")
        expect(policy.events).toEqual(["admit a", "gone a"])
        expect(participation.members).toEqual([])
    })

    test("a client that quit then is gone → the mode is not told twice", () => {
        const { room, policy, timer } = hosted()
        const { receiver } = playing(room, timer, "a")
        receiver.quit()
        room.leave("a")
        expect(policy.events).toEqual(["admit a", "quit a"])
    })

    test("the host takes part as any other", () => {
        const { policy, participation } = hosted()
        const state = participation.addLocal("host")
        expect(state).toEqual({ game: GAME, role: "player", seat: "seat-host" })
        expect(participation.addLocal("host")).toEqual(state)
        participation.quitLocal("host")
        expect(policy.events).toEqual(["admit host", "quit host"])
    })

    test("members in the order they came", () => {
        const { room, participation, timer } = hosted()
        playing(room, timer, "b")
        participation.addLocal("host")
        playing(room, timer, "a")
        expect(participation.members.map(member => member.id)).toEqual(["b", "host", "a"])
    })
})

describe("ParticipationReceiver", () => {
    test("a join lost on the way → said again until the host answers", () => {
        const { room, policy, timer } = hosted()
        const link = room.join("a")
        room.drop("a")
        const receiver = new ParticipationReceiver(link, GAME, timer)
        receiver.join()
        expect(receiver.state).toBeNull()
        room.back("a")
        timer.advance(JOIN_RETRY_MS)
        expect(receiver.state?.role).toBe("player")
        expect(policy.events).toEqual(["admit a"])
    })

    test("no answer after all the tries → ended with a fault, and no more asking", () => {
        const room = new LocalRoom()
        const timer = new ManualScheduler()
        const sent: string[] = []
        const link = room.join("a")
        const spying = { send: (message: string) => { sent.push(message); link.send(message) }, listen: link.listen }
        const receiver = new ParticipationReceiver(spying, GAME, timer)
        receiver.join()
        const ended: Fault[] = []
        receiver.ended.add(fault => ended.push(fault))
        timer.advance(JOIN_RETRY_MS * (JOIN_TRIES + 3))
        expect(ended).toHaveLength(1)
        expect(ended[0]).toBeInstanceOf(NotAdmittedFault)
        expect(sent).toHaveLength(JOIN_TRIES)
    })

    test("disposed → no more asking", () => {
        const room = new LocalRoom()
        const timer = new ManualScheduler()
        const receiver = new ParticipationReceiver(room.join("a"), GAME, timer)
        receiver.join()
        const ended: Fault[] = []
        receiver.ended.add(fault => ended.push(fault))
        receiver.dispose()
        timer.advance(JOIN_RETRY_MS * (JOIN_TRIES + 3))
        expect(ended).toEqual([])
    })
})
