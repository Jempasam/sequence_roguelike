import { Admissions, GameSession, LocalRoom, ParticipationReceiver } from "@game/core/mecard/sync"
import type { Admission, Arrival, ParticipationPolicy } from "@game/core/mecard/sync"
import { ManualScheduler } from "@game/core"
import { describe, expect, test } from "vitest"

// --- Fixture builders ---

/** A policy that writes down what it is asked, and gives what it is told to give. */
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

function sessioned() {
    const room = new LocalRoom()
    const session = new GameSession(room, 1)
    const policy = new Recorded()
    session.bind(policy)
    const timer = new ManualScheduler()
    // What the bricks of a mode hear of the players.
    const heard: string[] = []
    session.room.onJoin(peer => heard.push(`join ${peer.id}`))
    session.room.onLost(peer => heard.push(`lost ${peer.id}`))
    session.room.onBack(peer => heard.push(`back ${peer.id}`))
    session.room.onLeave(peer => heard.push(`leave ${peer.id}`))
    return { room, session, policy, timer, heard }
}

function joining(room: LocalRoom, timer: ManualScheduler, id: string): ParticipationReceiver {
    const receiver = new ParticipationReceiver(room.join(id), 1, timer)
    receiver.join()
    return receiver
}

// --- Tests ---

describe("GameSession", () => {
    test("a client that joins → a participant that plays, heard by the bricks of the mode as a player", () => {
        const { room, session, timer, heard } = sessioned()
        joining(room, timer, "a")
        const ana = session.participant("a")
        expect(ana?.presence).toBe("player")
        expect(ana?.seat).toBe("seat-a")
        expect(session.players.map(each => each.id)).toEqual(["a"])
        expect(heard).toEqual(["join a"])
    })

    test("a spectator → a participant, and no player: the bricks of the mode never hear of it", () => {
        const { room, session, policy, timer, heard } = sessioned()
        policy.next = () => Admissions.spectate()
        joining(room, timer, "a")
        expect(session.participant("a")?.presence).toBe("spectator")
        expect(session.players).toEqual([])
        expect(session.spectators.map(each => each.id)).toEqual(["a"])
        expect(heard).toEqual([])
    })

    test("a player that quits and stays in the room → the bricks hear it leave, and the mode is told", () => {
        const { room, session, policy, timer, heard } = sessioned()
        const receiver = joining(room, timer, "a")
        receiver.quit()
        expect(heard).toEqual(["join a", "leave a"])
        expect(policy.events).toEqual(["admit a", "quit a"])
        expect(session.participant("a")?.presence).toBe("left")
        expect(session.participant("a")?.seat).toBeNull()
        expect(session.players).toEqual([])
    })

    test("a player gone for good → the bricks hear it leave once, the mode is told how", () => {
        const { room, session, policy, timer, heard } = sessioned()
        const gone: string[] = []
        session.left.add(({ who, how }) => gone.push(`${who.id} ${how}`))
        joining(room, timer, "a")
        room.leave("a")
        expect(heard).toEqual(["join a", "leave a"])
        expect(policy.events).toEqual(["admit a", "gone a"])
        expect(gone).toEqual(["a gone"])
    })

    test("a connection lost then back → told to the mode and to the bricks, the participant kept", () => {
        const { room, session, policy, timer, heard } = sessioned()
        joining(room, timer, "a")
        room.drop("a")
        expect(session.participant("a")?.connection).toBe("lost")
        room.back("a")
        expect(session.participant("a")?.connection).toBe("connected")
        expect(heard).toEqual(["join a", "lost a", "back a"])
        expect(policy.events).toEqual(["admit a", "lost a", "back a"])
    })

    test("a player that quits then joins again → the same participant, admitted again, heard to join again", () => {
        const { room, session, timer, heard } = sessioned()
        const link = room.join("a")
        const first = new ParticipationReceiver(link, 1, timer)
        first.join()
        const ana = session.participant("a")
        first.quit()
        const second = new ParticipationReceiver(link, 1, timer)
        second.join()
        expect(session.participant("a")).toBe(ana)
        expect(ana?.presence).toBe("player")
        expect(heard).toEqual(["join a", "leave a", "join a"])
    })

    test("a spectator that asks again → the mode is asked again, and it may play", () => {
        const { room, session, policy, timer, heard } = sessioned()
        policy.next = () => Admissions.spectate()
        const link = room.join("a")
        new ParticipationReceiver(link, 1, timer).join()
        expect(session.players).toEqual([])
        policy.next = who => Admissions.seat(`seat-${who.id}`)
        const again = new ParticipationReceiver(link, 1, timer)
        again.join()
        expect(session.participant("a")?.presence).toBe("player")
        expect(heard).toEqual(["join a"])
    })

    test("the host takes part as any other, and is not a peer the bricks hear", () => {
        const { session, policy, heard } = sessioned()
        const host = session.addLocal("host")
        expect(host.presence).toBe("player")
        expect(host.peer).toBeNull()
        expect(policy.events).toEqual(["admit host"])
        expect(heard).toEqual([])
    })

    test("no policy → everyone only watches", () => {
        const room = new LocalRoom()
        const session = new GameSession(room, 1)
        new ParticipationReceiver(room.join("a"), 1, new ManualScheduler()).join()
        expect(session.participant("a")?.presence).toBe("spectator")
    })

    test("a client of another game → not heard", () => {
        const { room, session, policy } = sessioned()
        new ParticipationReceiver(room.join("a"), 2, new ManualScheduler()).join()
        expect(session.participants).toEqual([])
        expect(policy.events).toEqual([])
    })

    test("disposed → nothing is heard any more", () => {
        const { room, session, policy, timer, heard } = sessioned()
        joining(room, timer, "a")
        session.dispose()
        room.leave("a")
        expect(heard).toEqual(["join a"])
        expect(policy.events).toEqual(["admit a"])
    })
})
