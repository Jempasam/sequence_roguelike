import { ManualScheduler } from "@game/core"
import type { Fault } from "@game/core"
import {
    Placements, AlreadyStartedFault, Attendee, Deadline, DeadlineReceiver, GatheringFullFault, Gathering, LocalRoom,
    LocalSync, MANUAL, whenCount,
} from "@game/core/mecard/sync"
import type { GatheringOptions, Member, StartRule, SyncLink } from "@game/core/mecard/sync"
import { describe, expect, test } from "vitest"

// --- Fixture builders ---

interface Gathered {
    readonly room: LocalRoom
    readonly gathering: Gathering
    readonly joined: string[]
    readonly left: string[]
    readonly started: (readonly Member[])[]
    readonly faults: Fault[]
}

function gathered(rule: StartRule = MANUAL, capacity?: number): Gathered {
    const room = new LocalRoom()
    const gathering = new Gathering(room, rule, { capacity })
    const joined: string[] = []
    const left: string[] = []
    const started: (readonly Member[])[] = []
    const faults: Fault[] = []
    gathering.memberJoined.add(member => joined.push(member.id))
    gathering.memberLeft.add(member => left.push(member.id))
    gathering.started.add(members => started.push(members))
    gathering.faulted.add(fault => faults.push(fault))
    return { room, gathering, joined, left, started, faults }
}

/** A client coming to play: it says so, and hears who came. */
function attending(room: LocalRoom, id: string): {
    readonly link: SyncLink
    readonly attendee: Attendee
    readonly told: (readonly string[])[]
} {
    const link = room.join(id)
    const attendee = new Attendee(link)
    const told: (readonly string[])[] = []
    attendee.membersChanged.add(members => told.push(members))
    attendee.join()
    return { link, attendee, told }
}

// --- Tests ---

describe("Gathering", () => {
    test("a client saying it came → a member, told who came", () => {
        const { room, joined, gathering } = gathered()
        const { told } = attending(room, "a")
        expect(joined).toEqual(["a"])
        expect(gathering.members.map(member => member.id)).toEqual(["a"])
        expect(told.at(-1)).toEqual(["a"])
    })

    test("a client that says nothing → no member", () => {
        const { room, joined } = gathered()
        room.join("watching")
        expect(joined).toEqual([])
    })

    test("a second hello → no second member", () => {
        const { room, joined } = gathered()
        const { attendee } = attending(room, "a")
        attendee.join()
        expect(joined).toEqual(["a"])
    })

    test("every member → told of who came, each time it changes", () => {
        const { room } = gathered()
        const a = attending(room, "a")
        const b = attending(room, "b")
        expect(a.told.at(-1)).toEqual(["a", "b"])
        expect(b.told.at(-1)).toEqual(["a", "b"])
    })

    test("a member leaving for good → left, the others told", () => {
        const { room, left } = gathered()
        const a = attending(room, "a")
        attending(room, "b")
        room.leave("b")
        expect(left).toEqual(["b"])
        expect(a.told.at(-1)).toEqual(["a"])
    })

    test("a member whose connection is only lost → still a member, told again when back", () => {
        const { room, left } = gathered()
        const a = attending(room, "a")
        room.drop("a")
        const before = a.told.length
        room.back("a")
        expect(left).toEqual([])
        expect(a.told.length).toBe(before + 1)
        expect(a.told.at(-1)).toEqual(["a"])
    })

    test("MANUAL → never starts by itself, and starts once the host says", () => {
        const { room, gathering, started } = gathered(MANUAL)
        attending(room, "a")
        attending(room, "b")
        expect(started).toEqual([])
        gathering.start()
        gathering.start()
        expect(started).toHaveLength(1)
        expect(started[0].map(member => member.id)).toEqual(["a", "b"])
    })

    test("whenCount → starts as the last one comes, and every member is told", () => {
        const { room, started } = gathered(whenCount(2))
        let startedA = 0
        const a = attending(room, "a")
        a.attendee.started.add(() => startedA++)
        expect(started).toEqual([])
        attending(room, "b")
        expect(started).toHaveLength(1)
        expect(startedA).toBe(1)
    })

    test("no room left → the Gathering faults, the Attendee ends with a GatheringFullFault, no member", () => {
        const { room, gathering, faults } = gathered(MANUAL, 1)
        attending(room, "a")
        const ended: Fault[] = []
        const attendee = new Attendee(room.join("b"))
        attendee.ended.add(fault => ended.push(fault))
        attendee.join()
        expect(gathering.members.map(member => member.id)).toEqual(["a"])
        expect(faults[0]).toBeInstanceOf(GatheringFullFault)
        expect(ended).toHaveLength(1)
        expect(ended[0]).toBeInstanceOf(GatheringFullFault)
    })

    test("a client coming once it started → told, ended with an AlreadyStartedFault, and no member", () => {
        const { room, gathering, faults } = gathered()
        attending(room, "a")
        gathering.start()
        const ended: Fault[] = []
        const attendee = new Attendee(room.join("late"))
        attendee.ended.add(fault => ended.push(fault))
        attendee.join()
        expect(gathering.members.map(member => member.id)).toEqual(["a"])
        expect(faults.at(-1)).toBeInstanceOf(AlreadyStartedFault)
        expect(ended[0]).toBeInstanceOf(AlreadyStartedFault)
    })

    test("a member told that the game started, when its connection comes back", () => {
        const { room, gathering } = gathered()
        const a = attending(room, "a")
        const starts: number[] = []
        a.attendee.started.add(() => starts.push(1))
        gathering.start()
        room.drop("a")
        room.back("a")
        expect(starts).toEqual([1, 1])
    })

    test("a member ready → readyChanged, told once, and forgotten when it leaves", () => {
        const { room, gathering } = gathered()
        const changed: string[] = []
        gathering.readyChanged.add(member => changed.push(`${member.id}:${gathering.isReady(member.id)}`))
        const a = attending(room, "a")
        a.attendee.ready(true)
        a.attendee.ready(true)
        a.attendee.ready(false)
        a.attendee.ready(true)
        expect(changed).toEqual(["a:true", "a:false", "a:true"])
        room.leave("a")
        expect(gathering.isReady("a")).toBe(false)
    })

    test("a client that is no member saying it is ready → left out", () => {
        const { room, gathering } = gathered()
        const changed: string[] = []
        gathering.readyChanged.add(member => changed.push(member.id))
        new Attendee(room.join("watching")).ready(true)
        expect(changed).toEqual([])
        expect(gathering.isReady("watching")).toBe(false)
    })

    test("a deadline that comes → expired with the members, and nothing started", () => {
        const room = new LocalRoom()
        const timer = new ManualScheduler()
        const deadline = new Deadline(timer, new LocalSync())
        const gathering = new Gathering(room, MANUAL, { deadline })
        const expired: (readonly Member[])[] = []
        const started: unknown[] = []
        gathering.expired.add(members => expired.push(members))
        gathering.started.add(members => started.push(members))
        attending(room, "a")
        deadline.start(5_000)
        timer.advance(5_000)
        expect(expired).toHaveLength(1)
        expect(expired[0].map(member => member.id)).toEqual(["a"])
        expect(started).toEqual([])
    })

    test("starting → the deadline cancelled", () => {
        const room = new LocalRoom()
        const timer = new ManualScheduler()
        const deadline = new Deadline(timer, new LocalSync())
        const gathering = new Gathering(room, MANUAL, { deadline })
        deadline.start(5_000)
        gathering.start()
        expect(deadline.isRunning).toBe(false)
    })

    test("a member added locally → a member with no peer, told as any member joined", () => {
        const { room, joined, gathering } = gathered()
        const added = gathering.addLocal("hub")
        expect(added).toEqual({ id: "hub", peer: null })
        expect(joined).toEqual(["hub"])
        expect(gathering.memberOf("hub")?.peer).toBeNull()
        const { told } = attending(room, "a")
        expect(told.at(-1)).toEqual(["hub", "a"])
    })

    test("a member added locally twice → one member", () => {
        const { joined, gathering } = gathered()
        gathering.addLocal("hub")
        gathering.addLocal("hub")
        expect(joined).toEqual(["hub"])
    })

    test("a member added locally counts for the rule and the capacity", () => {
        const { room, gathering, started, faults } = gathered(whenCount(2), 2)
        gathering.addLocal("hub")
        attending(room, "a")
        expect(started).toHaveLength(1)
        expect(started[0].map(member => member.id)).toEqual(["hub", "a"])
        attending(room, "b")
        expect(faults).toHaveLength(1)
    })

    test("added locally when full or started → turned away, with the fault returned and told", () => {
        const { gathering, faults } = gathered(MANUAL, 1)
        gathering.addLocal("hub")
        const full = gathering.addLocal("other")
        expect(full).toBeInstanceOf(GatheringFullFault)
        gathering.start()
        const late = gathered()
        late.gathering.start()
        expect(late.gathering.addLocal("hub")).toBeInstanceOf(AlreadyStartedFault)
        expect(faults).toEqual([])
    })

    test("a local member saying it is ready → told as a member saying it", () => {
        const { gathering } = gathered()
        const ready: string[] = []
        gathering.readyChanged.add(member => ready.push(member.id))
        gathering.addLocal("hub")
        gathering.setReady("hub", true)
        gathering.setReady("hub", true)
        expect(gathering.isReady("hub")).toBe(true)
        gathering.setReady("hub", false)
        gathering.setReady("nobody", true)
        expect(ready).toEqual(["hub", "hub"])
        expect(gathering.isReady("hub")).toBe(false)
    })
})

describe("Deadline", () => {
    function running(): {
        readonly timer: ManualScheduler
        readonly deadline: Deadline
        readonly channel: LocalSync
    } {
        const timer = new ManualScheduler()
        const channel = new LocalSync()
        return { timer, deadline: new Deadline(timer, channel), channel }
    }

    test("started → the host tells how long is left, and a client counts it down", () => {
        const { timer, deadline, channel } = running()
        const client = new DeadlineReceiver(timer, channel)
        deadline.start(10_000)
        expect(client.remaining()).toBe(10_000)
        timer.advance(4_000)
        expect(client.remaining()).toBe(6_000)
        expect(deadline.remaining()).toBe(6_000)
    })

    test("the host's time over → the host tells, and the client's expired is told then, once", () => {
        const { timer, deadline, channel } = running()
        const client = new DeadlineReceiver(timer, channel)
        const hostSide: number[] = []
        const clientSide: number[] = []
        deadline.expired.add(() => hostSide.push(1))
        client.expired.add(() => clientSide.push(1))
        deadline.start(1_000)
        timer.advance(1_000)
        expect(hostSide).toEqual([1])
        expect(clientSide).toEqual([1])
        expect(client.remaining()).toBe(null)
        expect(deadline.isRunning).toBe(false)
    })

    test("a client with no clock of its own → never ends it before the host says", () => {
        const { timer, deadline, channel } = running()
        const client = new DeadlineReceiver(timer, channel)
        const clientSide: number[] = []
        client.expired.add(() => clientSide.push(1))
        deadline.start(1_000)
        // Its count is for display: nothing runs it out by itself.
        expect(clientSide).toEqual([])
    })

    test("cancelled → nothing comes, and the client is told there is none", () => {
        const { timer, deadline, channel } = running()
        const client = new DeadlineReceiver(timer, channel)
        const hostSide: number[] = []
        deadline.expired.add(() => hostSide.push(1))
        deadline.start(1_000)
        deadline.cancel()
        timer.advance(5_000)
        expect(hostSide).toEqual([])
        expect(client.remaining()).toBe(null)
    })

    test("started → told on the host and to the clients, with how long it runs", () => {
        const { timer, deadline, channel } = running()
        const client = new DeadlineReceiver(timer, channel)
        const hostSide: number[] = []
        const clientSide: number[] = []
        deadline.started.add(ms => hostSide.push(ms))
        client.started.add(ms => clientSide.push(ms))
        deadline.start(4_000)
        deadline.cancel()
        expect(hostSide).toEqual([4_000])
        expect(clientSide).toEqual([4_000])
    })

    test("a client connecting later → told how long is left as it stands", () => {
        const { timer, deadline, channel } = running()
        deadline.start(10_000)
        timer.advance(3_000)
        const late = new DeadlineReceiver(timer, channel)
        expect(late.remaining()).toBe(7_000)
    })

    test("a message that cannot be read → left out, told as a fault", () => {
        const { timer, channel } = running()
        const client = new DeadlineReceiver(timer, channel)
        const faults: Fault[] = []
        client.faulted.add(fault => faults.push(fault))
        channel.send("deadline:{\"remainingMs\":\"soon\"}")
        expect(faults).toHaveLength(1)
        expect(client.remaining()).toBe(null)
    })
})

describe("Gathering, once it started", () => {
    function startedWith(late?: GatheringOptions["late"]): Gathered & { readonly lost: string[], readonly back: string[] } {
        const room = new LocalRoom()
        const gathering = new Gathering(room, MANUAL, { late })
        const joined: string[] = []
        const left: string[] = []
        const lost: string[] = []
        const back: string[] = []
        const faults: Fault[] = []
        gathering.memberJoined.add(member => joined.push(member.id))
        gathering.memberLeft.add(member => left.push(member.id))
        gathering.memberLost.add(member => lost.push(member.id))
        gathering.memberBack.add(member => back.push(member.id))
        gathering.faulted.add(fault => faults.push(fault))
        attending(room, "a")
        gathering.start()
        return { room, gathering, joined, left, started: [], faults, lost, back }
    }

    test("the mode gives a place to a client that comes → a member, told the game started", () => {
        const { room, gathering } = startedWith(who => Placements.seat(who.id))
        let started = 0
        const late = attending(room, "late")
        late.attendee.started.add(() => started++)
        // The answer came as it joined, before the listener was added: told again when the others change.
        expect(gathering.memberOf("late")).not.toBeNull()
        attending(room, "next")
        expect(started).toBe(1)
    })

    test("the mode makes it a spectator → no member, no fault, not turned away", () => {
        const { room, gathering, faults } = startedWith(() => Placements.spectate())
        const { attendee } = attending(room, "late")
        expect(gathering.memberOf("late")).toBeNull()
        expect(faults).toEqual([])
        expect(attendee.participation?.role).toBe("spectator")
    })

    test("a member whose connection is lost and comes back → told of both, and still a member", () => {
        const { room, gathering, lost, back } = startedWith()
        room.drop("a")
        expect(lost).toEqual(["a"])
        expect(gathering.memberOf("a")).not.toBeNull()
        room.back("a")
        expect(back).toEqual(["a"])
    })

    test("a member that quits the game → told it left, and a client that comes is dealt with as a newcomer", () => {
        const { room, gathering, left } = startedWith(who => Placements.seat(who.id))
        const { attendee } = attending(room, "b")
        attendee.quit()
        expect(left).toEqual(["b"])
        expect(gathering.memberOf("b")).toBeNull()
        attendee.join()
        expect(gathering.memberOf("b")).not.toBeNull()
    })
})
