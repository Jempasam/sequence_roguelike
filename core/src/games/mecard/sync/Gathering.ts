import type { SyncLink, SyncPeer, SyncRoom } from "../../../platform"
import type { Fault } from "../../../engine/net/Fault"
import type { Deadline } from "./Deadline"
import {
    GATHER_FULL_TOPIC, GATHER_LATE_TOPIC, GATHER_MEMBERS_TOPIC, GATHER_START_TOPIC, JOIN_TOPIC, READY_TOPIC,
} from "./SyncChannel"
import { AlreadyStartedFault, GatheringFullFault, signal, UnreadableFault } from "./faults"
import { readJson, wrongShape } from "./read"

/** A client that came to play. */
export interface Member {
    /** The id of its connection's session. */
    readonly id: string

    /** The way to tell it things, none for a member that plays on the host itself. */
    readonly peer: SyncPeer|null
}

/** When a gathering starts by itself: polymorphic, so a mode brings its own rule. */
export interface StartRule {
    /** Does it start now, with these members? It is asked each time someone comes. */
    shouldStart(members: readonly Member[]): boolean
}

/** It starts when the host says so, and by itself never. */
export const MANUAL: StartRule = { shouldStart: () => false }

/** It starts as soon as this many came. */
export function whenCount(count: number): StartRule {
    return { shouldStart: members => members.length >= count }
}

/** What a {@link Gathering} is made with. */
export interface GatheringOptions {
    /** The most members it takes, none to take everyone. */
    readonly capacity?: number

    /** A time limit: when it comes, the gathering tells it, and starts nothing. */
    readonly deadline?: Deadline
}

/**
 * The clients that come to play a game, before and while it is played: a client says it came, the host tells
 * it who else did, then that the game starts.
 *
 * @remarks
 * Its rule says when it starts by itself. The host may also start it, and a game that welcomes whoever
 * comes, as a run does, never starts it. A client that comes when there is no room, or once it started, is
 * told, and is not a member.
 *
 * A client whose connection comes back is told again what it missed.
 */
export class Gathering {


    /** Told of each client that came. */
    public readonly memberJoined = signal<Member>()

    /** Told of each member that left for good. */
    public readonly memberLeft = signal<Member>()

    /** Told of each member that says it is ready, or not any more: see {@link Gathering.isReady}. */
    public readonly readyChanged = signal<Member>()

    /** Told once, with the members, when it starts. */
    public readonly started = signal<readonly Member[]>()

    /** Told once the time limit came, with the members. */
    public readonly expired = signal<readonly Member[]>()

    /** Told of what was dealt with: a client turned away. */
    public readonly faulted = signal<Fault>()

    constructor(
        room: SyncRoom,
        private readonly rule: StartRule,
        private readonly options: GatheringOptions = {},
    ){
        this.#handles = [
            room.onJoin(peer => this.#listen(peer)),
            room.onBack(peer => this.#tell(peer)),
            room.onLeave(peer => this.#leave(peer)),
        ]
        const deadline = options.deadline?.expired.add(() => this.expired.notify(this.members))
        if(deadline) this.#handles.push({ dispose: () => deadline.remove() })
    }


    /** The members, in the order they came. */
    public get members(): readonly Member[] {
        return [...this.#members.values()]
    }

    public get isStarted(): boolean { return this.#isStarted }

    /** Did a member say it is ready? */
    public isReady(id: string): boolean {
        return this.#ready.has(id)
    }

    /** The member of an id, none when there is none. */
    public memberOf(id: string): Member|null {
        return this.#members.get(id) ?? null
    }

    /** Start it now, whatever the rule says. Starting twice changes nothing. */
    public start(): void {
        if(this.#isStarted) return
        this.#isStarted = true
        this.options.deadline?.cancel()
        const members = this.members
        for(const { peer } of members) if(peer) GATHER_START_TOPIC.link(peer).send("")
        this.started.notify(members)
    }

    /**
     * Take in a member that plays on the host itself: it has no peer, so nothing is told to it, and it is
     * welcomed as a client is, with the same refusals.
     *
     * @returns The member, or why it is turned away. It never throws.
     */
    public addLocal(id: string): Member|Fault {
        const known = this.#members.get(id)
        if(known) return known
        const fault = this.#refusal(id)
        if(fault) return fault
        const member: Member = { id, peer: null }
        this.#admit(member)
        return member
    }

    /** Say whether a member is ready, as a client says it: a member playing on the host has no other way. */
    public setReady(id: string, isReady: boolean): void {
        const member = this.#members.get(id)
        if(!member || this.#ready.has(id) === isReady) return
        if(isReady) this.#ready.add(id)
        else this.#ready.delete(id)
        this.readyChanged.notify(member)
    }

    /** Stop listening. */
    public dispose(): void {
        for(const handle of this.#handles) handle.dispose()
        for(const handles of this.#listening.values()) for(const handle of handles) handle.dispose()
        this.#listening.clear()
    }


    readonly #handles: { dispose(): void }[]
    readonly #members = new Map<string, Member>()
    readonly #listening = new Map<string, { dispose(): void }[]>()
    readonly #ready = new Set<string>()
    #isStarted = false

    /** Listen to a client that connects: it may say it came to play, then that it is ready. */
    #listen(peer: SyncPeer): void {
        this.#listening.get(peer.id)?.forEach(handle => handle.dispose())
        this.#listening.set(peer.id, [
            JOIN_TOPIC.link(peer).listen(() => this.#welcome(peer)),
            READY_TOPIC.link(peer).listen(text => this.#readied(peer.id, text)),
        ])
    }

    /** What a member says of being ready: `1` or `0`, anything else is left out. A non-member is unheard. */
    #readied(id: string, text: string): void {
        if(text !== "1" && text !== "0") return
        this.setReady(id, text === "1")
    }

    #welcome(peer: SyncPeer): void {
        if(this.#members.has(peer.id)) return
        const fault = this.#refusal(peer.id)
        if(fault instanceof AlreadyStartedFault) GATHER_LATE_TOPIC.link(peer).send("")
        else if(fault) GATHER_FULL_TOPIC.link(peer).send("")
        if(fault){
            this.faulted.notify(fault)
            return
        }
        this.#admit({ id: peer.id, peer })
    }

    /** Why a newcomer is turned away, none when it is taken in. */
    #refusal(id: string): Fault|null {
        if(this.#isStarted) return new AlreadyStartedFault(id)
        const { capacity } = this.options
        if(capacity !== undefined && this.#members.size >= capacity) return new GatheringFullFault(id)
        return null
    }

    #admit(member: Member): void {
        this.#members.set(member.id, member)
        this.memberJoined.notify(member)
        this.#tellAll()
        if(!this.#isStarted && this.rule.shouldStart(this.members)) this.start()
    }

    #leave(peer: SyncPeer): void {
        for(const handle of this.#listening.get(peer.id) ?? []) handle.dispose()
        this.#listening.delete(peer.id)
        const member = this.#members.get(peer.id)
        if(!member) return
        this.#members.delete(peer.id)
        this.#ready.delete(peer.id)
        this.memberLeft.notify(member)
        this.#tellAll()
    }

    /** Tell a client who came, and that it started if it did. */
    #tell(peer: SyncPeer): void {
        if(!this.#members.has(peer.id)) return
        GATHER_MEMBERS_TOPIC.link(peer).send(JSON.stringify([...this.#members.keys()]))
        if(this.#isStarted) GATHER_START_TOPIC.link(peer).send("")
    }

    #tellAll(): void {
        for(const { peer } of this.#members.values()) if(peer) this.#tell(peer)
    }
}

/**
 * A client of a {@link Gathering}: it says it came, hears who else did, and that the game starts.
 *
 * @remarks
 * A refusal, no room left or a game started already, ends it: the client is not a member.
 */
export class Attendee {


    /** Told of who came, by their ids, each time it changes. */
    public readonly membersChanged = signal<readonly string[]>()

    /** Told once, when the game starts. */
    public readonly started = signal<void>()

    /** Told of a message that could not be read: it is left out. */
    public readonly faulted = signal<Fault>()

    /** Told once, when the client is turned away. */
    public readonly ended = signal<Fault>()

    constructor(private readonly link: SyncLink){
        this.#handles = [
            GATHER_MEMBERS_TOPIC.source(link).listen(text => this.#members(text)),
            GATHER_START_TOPIC.source(link).listen(() => this.started.notify()),
            GATHER_FULL_TOPIC.source(link).listen(() => this.#end(new GatheringFullFault(null))),
            GATHER_LATE_TOPIC.source(link).listen(() => this.#end(new AlreadyStartedFault(null))),
        ]
    }


    /**
     * Say it came to play. It is a call of its own, so what listens to the answer is added first: a channel
     * may answer at once.
     */
    public join(): void {
        JOIN_TOPIC.link(this.link).send("")
    }

    /** Say whether the client is ready, as the host and the others hear it. */
    public ready(isReady: boolean): void {
        READY_TOPIC.link(this.link).send(isReady ? "1" : "0")
    }

    /** Stop listening. */
    public dispose(): void {
        for(const handle of this.#handles) handle.dispose()
    }


    readonly #handles: readonly { dispose(): void }[]

    #members(text: string): void {
        const ids = readJson(GATHER_MEMBERS_TOPIC.name, text)
        if(ids instanceof UnreadableFault){
            this.faulted.notify(ids)
            return
        }
        if(!Array.isArray(ids) || ids.some(id => typeof id !== "string")){
            this.faulted.notify(wrongShape(GATHER_MEMBERS_TOPIC.name, text, "list of members"))
            return
        }
        this.membersChanged.notify(ids as string[])
    }

    #end(fault: Fault): void {
        this.ended.notify(fault)
        this.dispose()
    }
}
