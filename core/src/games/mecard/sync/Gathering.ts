import type { SyncLink, SyncPeer, SyncRoom, TimerPort } from "../../../platform"
import type { Fault } from "../../../engine/net/Fault"
import type { Deadline } from "./Deadline"
import {
    GATHER_FULL_TOPIC, GATHER_LATE_TOPIC, GATHER_MEMBERS_TOPIC, GATHER_START_TOPIC, JOIN_TOPIC, READY_TOPIC,
} from "./SyncChannel"
import { AlreadyStartedFault, GatheringFullFault, signal, UnreadableFault } from "./faults"
import type { GameSession } from "./session/GameSession"
import { Placements, Participation } from "./participation/Participation"
import type { Placement, Arrival } from "./participation/Participation"
import { ParticipationReceiver } from "./participation/ParticipationReceiver"
import type { ParticipationMessage } from "./participation/ParticipationMessage"
import { readJson, wrongShape } from "./read"
import { Scope } from "../../../lifetime"
import type { Removable } from "../../../lifetime"

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

    /** The number of the game it gathers for, so what a client says of another game is not heard. */
    readonly game?: number

    /**
     * What becomes of a client that comes once it started: the mode decides, as it alone knows what is left to
     * take. A client is turned away with {@link AlreadyStartedFault} when the mode says nothing.
     */
    readonly late?: (who: Arrival) => Placement

    /** The session of the game, which keeps who takes part: the gathering is then a part of its mode. */
    readonly session?: GameSession
}

/**
 * The clients that come to play a game, before and while it is played: a client says it came, the host tells
 * it who else did, then that the game starts.
 *
 * @remarks
 * Its rule says when it starts by itself. The host may also start it, and a game that welcomes whoever
 * comes, as a run does, never starts it. A client that comes when there is no room is told, and is not a
 * member. One that comes once it started is dealt with by the mode, through {@link GatheringOptions.late}.
 *
 * It is made on a {@link Participation}, which keeps who takes part and turns what the room and the clients
 * say into events: a member whose connection is lost keeps its place, one that leaves the game or the room
 * does not. A client whose connection comes back is told again what it missed.
 */
export class Gathering {


    /** Told of each client that came. */
    public readonly memberJoined = signal<Member>()

    /** Told of each member that left for good, or left the game by itself. */
    public readonly memberLeft = signal<Member>()

    /** Told of each member whose connection is lost: it keeps its place. */
    public readonly memberLost = signal<Member>()

    /** Told of each member whose connection came back. */
    public readonly memberBack = signal<Member>()

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
        const policy = {
            admit: (who: Arrival) => this.#admit(who),
            onLost: (who: Arrival) => this.#lost(who),
            onBack: (who: Arrival) => this.#back(who),
            onQuit: (who: Arrival) => this.#left(who),
            onGone: (who: Arrival) => this.#left(who),
        }
        // Made on the session of the game when there is one, which then tells the bricks of the mode who leaves.
        const { session } = options
        this.#participation = session ? session.participation : new Participation(room, options.game ?? 0, policy)
        this.#isOwner = !session
        this.#handles = new Scope(
            ...(session ? [session.bind(policy)] : []),
            room.onJoin(peer => this.#listen(peer)),
            room.onLeave(peer => this.#forget(peer)),
            this.#participation.joined.add(who => this.#joined(who)),
            // What the host asked of itself is answered by the return of the call, not told.
            this.#participation.faulted.add(fault => { if(!this.#isLocalCall) this.faulted.notify(fault) }),
        )
        const deadline = options.deadline?.expired.add(() => this.expired.notify(this.members))
        if(deadline) this.#handles.track(deadline)
    }


    /** The members, in the order they came. */
    public get members(): readonly Member[] {
        return [...this.#members.values()]
    }

    public get isStarted(): boolean { return this.#isStarted }

    /** What keeps who takes part. */
    public get participation(): Participation { return this.#participation }

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
        this.#refused = null
        this.#isLocalCall = true
        this.#participation.addLocal(id)
        this.#isLocalCall = false
        return this.#members.get(id) ?? this.#refused ?? new AlreadyStartedFault(id)
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
        this.#handles.remove()
        for(const handles of this.#listening.values()) for(const handle of handles) handle.remove()
        this.#listening.clear()
        if(this.#isOwner) this.#participation.dispose()
    }


    readonly #participation: Participation
    readonly #isOwner: boolean
    readonly #handles: Scope
    readonly #members = new Map<string, Member>()
    readonly #listening = new Map<string, Removable[]>()
    readonly #ready = new Set<string>()
    #isStarted = false

    /** Why the last client was turned away, for the host that asked to be taken in. */
    #refused: Fault|null = null
    #isLocalCall = false

    /** Listen to a client that connects: it may say it is ready, or that it came to play the old way. */
    #listen(peer: SyncPeer): void {
        this.#listening.get(peer.id)?.forEach(handle => handle.remove())
        this.#listening.set(peer.id, [
            JOIN_TOPIC.link(peer).listen(() => { this.#participation.join(peer) }),
            READY_TOPIC.link(peer).listen(text => this.#readied(peer.id, text)),
        ])
    }

    #forget(peer: SyncPeer): void {
        for(const handle of this.#listening.get(peer.id) ?? []) handle.remove()
        this.#listening.delete(peer.id)
    }

    /** What a member says of being ready: `1` or `0`, anything else is left out. A non-member is unheard. */
    #readied(id: string, text: string): void {
        if(text !== "1" && text !== "0") return
        this.setReady(id, text === "1")
    }

    /** What a client that says it comes is given: a place, or the reason it has none. */
    #admit(who: Arrival): Placement {
        const admission = this.#decide(who)
        if(admission.kind === "refuse") this.#turnAway(who, admission.fault)
        return admission
    }

    /** A place, once the game started what the mode makes of the newcomer, or the reason it has none. */
    #decide(who: Arrival): Placement {
        if(this.#isStarted) return this.options.late?.(who) ?? Placements.refuse(new AlreadyStartedFault(who.id))
        const { capacity } = this.options
        if(capacity !== undefined && this.#members.size >= capacity){
            return Placements.refuse(new GatheringFullFault(who.id))
        }
        return Placements.seat(who.id)
    }

    /** Tell a client that is turned away why, in the words of the topic that says it. */
    #turnAway(who: Arrival, fault: Fault): void {
        this.#refused = fault
        if(!who.peer) return
        if(fault instanceof AlreadyStartedFault) GATHER_LATE_TOPIC.link(who.peer).send("")
        else if(fault instanceof GatheringFullFault) GATHER_FULL_TOPIC.link(who.peer).send("")
    }

    /** Someone was given its part: a player is a member. */
    #joined(who: Arrival): void {
        const state = this.#participation.stateOf(who.id)
        if(!state || state.role !== "player") return
        const member: Member = { id: who.id, peer: who.peer }
        this.#members.set(member.id, member)
        this.memberJoined.notify(member)
        this.#tellAll()
        if(!this.#isStarted && this.rule.shouldStart(this.members)) this.start()
    }

    #left(who: Arrival): void {
        const member = this.#members.get(who.id)
        if(!member) return
        this.#members.delete(who.id)
        this.#ready.delete(who.id)
        this.memberLeft.notify(member)
        this.#tellAll()
    }

    #lost(who: Arrival): void {
        const member = this.#members.get(who.id)
        if(member) this.memberLost.notify(member)
    }

    #back(who: Arrival): void {
        const member = this.#members.get(who.id)
        if(!member) return
        this.#tell(member)
        this.memberBack.notify(member)
    }

    /** Tell a client who came, and that it started if it did. */
    #tell({ peer, id }: Member): void {
        if(!peer || !this.#members.has(id)) return
        GATHER_MEMBERS_TOPIC.link(peer).send(JSON.stringify([...this.#members.keys()]))
        if(this.#isStarted) GATHER_START_TOPIC.link(peer).send("")
    }

    #tellAll(): void {
        for(const member of this.#members.values()) this.#tell(member)
    }
}

/**
 * A client of a {@link Gathering}: it says it came, hears who else did, and that the game starts.
 *
 * @remarks
 * It says it comes through a {@link ParticipationReceiver}, so it says it again until the host answers when it
 * is given a timer. A refusal, no room left or a mode that turns it away, ends it: the client is not a member.
 */
export class Attendee {


    /** Told of who came, by their ids, each time it changes. */
    public readonly membersChanged = signal<readonly string[]>()

    /** Told once, when the game starts. */
    public readonly started = signal<void>()

    /** Told each time what the client holds changes, the first time included. */
    public readonly participationChanged = signal<ParticipationMessage>()

    /** Told of a message that could not be read: it is left out. */
    public readonly faulted = signal<Fault>()

    /** Told once, when the client is turned away. */
    public readonly ended = signal<Fault>()

    constructor(
        private readonly link: SyncLink,
        options: { readonly game?: number, readonly timer?: TimerPort } = {},
    ){
        this.#participation = new ParticipationReceiver(link, options.game ?? 0, options.timer ?? null)
        this.#handles = new Scope(
            GATHER_MEMBERS_TOPIC.source(link).listen(text => this.#members(text)),
            GATHER_START_TOPIC.source(link).listen(() => this.started.notify()),
            GATHER_FULL_TOPIC.source(link).listen(() => this.#end(new GatheringFullFault(null))),
            GATHER_LATE_TOPIC.source(link).listen(() => this.#end(new AlreadyStartedFault(null))),
            this.#participation.changed.add(state => this.participationChanged.notify(state)),
            this.#participation.faulted.add(fault => this.faulted.notify(fault)),
            this.#participation.ended.add(fault => this.#end(fault)),
        )
    }


    /** What the host says the client holds, none until it said. */
    public get participation(): ParticipationMessage|null { return this.#participation.state }

    /**
     * Say it came to play. It is a call of its own, so what listens to the answer is added first: a channel
     * may answer at once.
     */
    public join(): void {
        this.#participation.join()
    }

    /** Say it leaves the game, and may come back to it. */
    public quit(): void {
        this.#participation.quit()
    }

    /** Say whether the client is ready, as the host and the others hear it. */
    public ready(isReady: boolean): void {
        READY_TOPIC.link(this.link).send(isReady ? "1" : "0")
    }

    /** Stop listening. */
    public dispose(): void {
        this.#handles.remove()
        this.#participation.dispose()
    }


    readonly #participation: ParticipationReceiver
    readonly #handles: Scope

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
